import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaConstruct } from './lambda-construct';
import { CloudFrontDistributionConstruct } from './cloudfront-distribution-construct';

export interface MainStackProps extends cdk.StackProps {
  hostedZoneId: string;
  zoneName: string;
  primaryRecordName: string;
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    // Create the Lambda and API Gateway construct
    const lambdaConstruct = new LambdaConstruct(this, 'LambdaConstruct');

    /* Create primary distro that will be used for the actual setting.
        the cname and cert will be generated, and the alias won't
     */
    const primaryDistribution = new CloudFrontDistributionConstruct(this, 'CloudFrontDistributionRoot', {
      api: lambdaConstruct.api,
      distributionName: 'IP-Rotation-0-Root',
      hostedZoneId: props.hostedZoneId,
      zoneName: props.zoneName,
      recordName: props.primaryRecordName,
      createAlias: false,
      createCname: true
    });

    /*
      Create secondary distro that will be used for the Alias only
     */
    const secondaryDistribution = new CloudFrontDistributionConstruct(this, 'CloudFrontDistribution1', {
      api: lambdaConstruct.api,
      distributionName: 'IP-Rotation-1',
      hostedZoneId: props.hostedZoneId,
      // zoneName: props.zoneName,
      // recordName: props.primaryRecordName, // Use the same record name for the alias
      createAlias: true,
      createCname: false
    });
    
    /*
      Create a third distro that will be used only as a placeholder for future ip rotation if needed
      This is done in order to reduce the amount of time it takes to create a new distro
     */
    const tertiaryDistribution = new CloudFrontDistributionConstruct(this, 'CloudFrontDistribution2', {
      api: lambdaConstruct.api,
      distributionName: 'IP-Rotation-2',
      hostedZoneId: props.hostedZoneId,
      zoneName: props.zoneName,
      recordName: props.primaryRecordName, // Use the same record name for the alias
      createAlias: false,
      createCname: false
    });
    
    // Short outputs as requested
    new cdk.CfnOutput(this, 'Domain', {
      value: `${props.primaryRecordName}.${props.zoneName}`,
      description: 'Domain name'
    });

    new cdk.CfnOutput(this, 'DistroForAlias', {
      value: secondaryDistribution.distribution.distributionId,
      description: 'Distribution used for Alias (IP addresses)'
    });

    new cdk.CfnOutput(this, 'DistroForSettings', {
      value: primaryDistribution.distribution.distributionId,
      description: 'Distribution used for Settings (CNAME + Certificate)'
    });
  }
}
