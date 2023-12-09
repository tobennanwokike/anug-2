import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({
    region: process.env.REGION || 'us-east-1',
});
const userPoolId = process.env.USER_POOL_ID;
const clientId = process.env.CLIENT_ID;

// login function
const login = async (loginRequest) => {

    const { email, password } = loginRequest;

    const authCommand = new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        ClientId: clientId,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        }
    });

    try{
        const response = await cognito.send(authCommand);
        if(response.AuthenticationResult.IdToken){
            return {
                statusCode: 200,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({
                  message: `User was logged in successfully`,
                  token: response.AuthenticationResult.IdToken
                })
              }
        }
    
        return {
            statusCode: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
              message: `Unauthorized access`
            })
          }
    }
    catch{
        return {
            statusCode: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
              message: `Unauthorized access`
            })
          }
    }

    
};

export const handler = async (event) => {
  const loginRequest = JSON.parse(event.body)
  const response =  await login( loginRequest )

  return response
}