import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, ApiError } from '../../src/middleware/errorHandler.js';

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;
  let statusMock: jest.Mock<any>;
  let jsonMock: jest.Mock<any>;

  beforeEach(() => {
    mockReq = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
    };
    nextFunction = jest.fn();

    // Spy on console.error to keep test output clean
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles ApiError correctly', () => {
    const error = new ApiError(404, 'Not Found', { details: 'test' });
    
    errorHandler(error, mockReq as Request, mockRes as Response, nextFunction);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        name: 'ApiError',
        message: 'Not Found',
        statusCode: 404,
        details: { details: 'test' }
      }
    });
  });

  it('handles generic Error correctly', () => {
    const error = new Error('Something broke!');
    
    errorHandler(error, mockReq as Request, mockRes as Response, nextFunction);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        name: 'InternalServerError',
        message: 'Something broke!',
        statusCode: 500
      }
    });
  });
});
