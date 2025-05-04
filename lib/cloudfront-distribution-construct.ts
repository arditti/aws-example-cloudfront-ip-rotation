import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';

export interface CloudFrontDistributionConstructProps {
    api: apigateway.RestApi;
    distributionName: string;
    hostedZoneId?: string;
    zoneName?: string;
    recordName?: string;
    createAlias: boolean;
    createCname: boolean;
}

export class CloudFrontDistributionConstruct extends Construct {
    public readonly distribution: cloudfront.Distribution;
    private readonly hostedZone?: route53.IHostedZone;

    constructor(scope: Construct, id: string, props: CloudFrontDistributionConstructProps) {
        super(scope, id);

        // Get the hosted zone if hostedZoneId and zoneName are provided
        if (props.hostedZoneId && props.zoneName) {
            this.hostedZone = this.getHostedZone(props.hostedZoneId, props.zoneName);
        }


        if (props.createCname) {
            // Get the full domain name for the certificate and distribution
            const fullDomainName = this.getFullDomainName(props.zoneName, props.recordName);
            // Create ACM certificate if needed
            const certificate = this.createCertificate(fullDomainName);
            this.distribution = this.createCloudFrontDistribution(props, certificate, fullDomainName);
        } else {
            this.distribution = this.createCloudFrontDistribution(props);
        }


        // Create Route53 record if needed and createAlias is true
        if (props.createAlias && props.recordName) {
            this.createRoute53Record(props.recordName);
        }

    }

    /**
     * Get the Route53 hosted zone
     */
    private getHostedZone(hostedZoneId: string, zoneName: string): route53.IHostedZone {
        return route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId: hostedZoneId,
            zoneName: zoneName,
        });
    }

    /**
     * Get the full domain name by combining zone name and record name
     */
    private getFullDomainName(zoneName?: string, recordName?: string): string | undefined {
        if (!zoneName) {
            return undefined;
        }

        if (!recordName || recordName === '@') {
            return zoneName;
        }

        return `${recordName}.${zoneName}`;
    }

    /**
     * Create ACM certificate with DNS validation if domain name is provided
     */
    private createCertificate(domainName?: string): acm.ICertificate | undefined {
        if (!domainName || !this.hostedZone) {
            return undefined;
        }

        return new acm.Certificate(this, 'Certificate', {
            domainName: domainName,
            validation: acm.CertificateValidation.fromDns(this.hostedZone),
        });
    }

    /**
     * Create CloudFront distribution
     */
    private createCloudFrontDistribution(
        props: CloudFrontDistributionConstructProps,
        certificate?: acm.ICertificate,
        domainName?: string
    ): cloudfront.Distribution {
        const domainNames = domainName ? [domainName] : undefined;

        return new cloudfront.Distribution(this, `${props.distributionName}Distribution`, {
            defaultBehavior: {
                origin: new origins.RestApiOrigin(props.api),
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cachedMethods:  cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress: true,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
            comment: `CloudFront distribution for ${props.distributionName}`,
            enabled: true,
            certificate: certificate,
            domainNames: domainNames,
        });
    }

    /**
     * Create Route53 record for the CloudFront distribution
     */
    private createRoute53Record(recordName?: string): void {
        if (!recordName || !this.hostedZone) {
            return;
        }

        new route53.ARecord(this, 'AliasRecord', {
            zone: this.hostedZone,
            recordName: recordName === '@' ? undefined : recordName, // @ represents the apex domain
            target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(this.distribution)),
        });
    }
}
