#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main-stack';

const app = new cdk.App();

// Check if we're running a destroy command
const isDestroy = process.argv.includes('destroy');

// Get context values with defaults
const hostedZoneId = app.node.tryGetContext('hostedZoneId');
const zoneName = app.node.tryGetContext('zoneName');
const primaryRecordName = app.node.tryGetContext('primaryRecordName');

// Only validate required context parameters if not destroying
if (!isDestroy && (!hostedZoneId || !zoneName || !primaryRecordName)) {
  console.error('Error: Missing required context parameters.');
  console.error('Please provide the following parameters:');
  console.error('  --context hostedZoneId=YOUR_HOSTED_ZONE_ID');
  console.error('  --context zoneName=YOUR_ZONE_NAME');
  console.error('  --context primaryRecordName=YOUR_PRIMARY_RECORD_NAME');
  process.exit(1);
}

new MainStack(app, 'CloudFrontIpRotationStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  // Pass context values to the stack (use empty strings for destroy)
  hostedZoneId: hostedZoneId || '',
  zoneName: zoneName || '',
  primaryRecordName: primaryRecordName || ''
});
