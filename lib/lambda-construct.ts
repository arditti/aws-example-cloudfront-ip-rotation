import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class LambdaConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create Lambda function
    const helloWorldFunction = new lambda.Function(this, 'HelloWorldFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'hello-world.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      description: 'A simple hello world Lambda function',
    });

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'HelloWorldApi', {
      restApiName: 'Hello World API',
      description: 'API for Hello World application',
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      deployOptions: {
        stageName: 'prod',
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    this.api.root.addMethod('ANY', new apigateway.LambdaIntegration(helloWorldFunction));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'URL of the API Gateway',
    });
  }
}
