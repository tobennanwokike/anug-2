import { PutItemCommand, GetItemCommand, UpdateItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"

const dynamoDb = new DynamoDBClient({
    region: process.env.REGION || 'us-east-1',
})
const summaryTable = process.env.SUMMARY_TABLE;

const transactionTable = process.env.TRANSACTIONS_TABLE;


const create = async (createRequest, userId) => {
  const transactionId = new Date().getTime().toString();

  const newItem = {
    transactionId,
    createdAt: new Date().toISOString(),
    userId: userId,
    ...createRequest
  }

  await createTransactionItem(newItem)

  //update summary to reflect new transaction
  const userSummary = await getSummaryItem(userId)

  if(createRequest.category == "credit"){
    userSummary.totalCredit += createRequest.amount
  }
  else{
    userSummary.totalDebit += createRequest.amount
  }

  const updateSummary = {
    totalCredit: userSummary.totalCredit,
    totalDebit: userSummary.totalDebit
  }

  await updateSummaryItem(userId, updateSummary)

  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      item: newItem
    })
  }

}

const createTransactionItem = async (transactionItem) => {
    const putItemCommand = new PutItemCommand({
        TableName: transactionTable,
        Item: marshall(transactionItem)
    });
    await dynamoDb.send(putItemCommand);
}

const getSummaryItem = async (userId) => {
    console.log(userId);
    const getItemCommand = new GetItemCommand({
        TableName: summaryTable,
        Key: {
            "userId": {
                "S": userId
            }
        }
    })
    const result = await dynamoDb.send(getItemCommand);
    console.log(result);
    let item = unmarshall(result.Item);

    item.profit = item.totalCredit - item.totalDebit
    return item
}

const updateSummaryItem = async (userId, summaryUpdate) => {
   
    const updateItemCommand = new UpdateItemCommand({
        TableName: summaryTable,
        Key: {
            "userId": {
                "S": userId
            }
        },
        UpdateExpression: 'set totalCredit = :totalCredit, totalDebit = :totalDebit, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
        ":totalCredit": summaryUpdate.totalCredit,
        ":totalDebit": summaryUpdate.totalDebit,
        ":updatedAt": new Date().toISOString()
      }
    })
    await dynamoDb.send(updateItemCommand);   
}


export const handler = async (event) => {

  const userId = event.requestContext.authorizer.claims.email
  const createRequest = JSON.parse(event.body)
  const response = await create( createRequest, userId )

  return response
}