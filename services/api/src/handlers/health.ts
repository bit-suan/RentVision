import { APIGatewayProxyResult } from 'aws-lambda';
import { successResponse } from '../utils/response';

/**
 * Health check handler for RentVision API.
 * 
 * Provides a basic availability check for the backend services.
 * In a production environment, this could be extended to check
 * database and S3 connectivity.
 */
export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  return successResponse({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'rentvision-api',
    version: process.env.SERVICE_VERSION || '1.0.0',
  });
};
