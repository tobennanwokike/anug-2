import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { PutItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { marshall } from "@aws-sdk/util-dynamodb"

const cognito = new CognitoIdentityProviderClient({
    region: process.env.REGION || 'us-east-1',
});
const dynamoDb = new DynamoDBClient({
    region: process.env.REGION || 'us-east-1',
})
const userPoolId = process.env.USER_POOL_ID;
const summaryTable = process.env.SUMMARY_TABLE;

// sign up function
const signup = async (signupRequest) => {

    await createUserItem(signupRequest)

    //create a new summary object
    const newSummaryItem = {
        createdAt: new Date().toISOString(),
        userId: signupRequest.email,
        totalCredit: 0,
        totalDebit: 0
    }

    await createSummaryItem(newSummaryItem)

    return {
        statusCode: 201,
        headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
        message: `User ${signupRequest.email} was successfully registered`
        })
    }
};

// create a new user
const createUserItem = async (userItem) => {

    const { email, password } = userItem;

    const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
            {
                Name: 'email',
                Value: email
            },
            {
                Name: 'email_verified',
                Value: 'true'
            } 
        ],
    });

    const response = await cognito.send(createUserCommand);
    if (response.User) {
        const setUserPasswordCommand = new AdminSetUserPasswordCommand({
            Password: password,
            UserPoolId: userPoolId,
            Username: email,
            Permanent: true
        });
        await cognito.send(setUserPasswordCommand);
    }

}

// create a summary item in db
const createSummaryItem = async (summaryItem) => {
    const putItemCommand = new PutItemCommand({
        TableName: summaryTable,
        Item: marshall(summaryItem)
    });
    await dynamoDb.send(putItemCommand);
  };



export const handler = async (event) => {

  const signupRequest = JSON.parse(event.body)

  const response = await signup(signupRequest)

  return response
};