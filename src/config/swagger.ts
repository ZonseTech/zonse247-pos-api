export const swaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
    },
};

export const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'POS System API Documentation',
            version: process.env.npm_package_version || '1.0.0',
            description: 'Comprehensive API documentation for the Point of Sale application',
            termsOfService: process.env.TERMS_URL || 'https://example.com/terms',
            contact: {
                name: 'POS API Support Team',
                email: process.env.SUPPORT_EMAIL || 'support@example.com',
                url: process.env.SUPPORT_URL || 'https://support.example.com',
            },
            license: {
                name: 'Proprietary',
                url: process.env.LICENSE_URL || 'https://example.com/license',
            },
        },
        externalDocs: {
            description: 'POS System User Guide',
            url: process.env.USER_GUIDE_URL || 'https://docs.example.com/pos',
        },
        servers: [
            {
                url: `${process.env.BASE_URL || 'http://localhost'}:${process.env.SERVER_PORT || 3000}/api/${process.env.API_VERSION || 'v1'}`,
                description: 'Development Environment',
                variables: {
                    port: {
                        default: process.env.SERVER_PORT || '3000',
                        description: 'Development server port',
                    }
                }
            },
            {
                url: `https://staging.${process.env.DOMAIN || 'example.com'}/api/${process.env.API_VERSION || 'v1'}`,
                description: 'Staging Environment',
            },
            ...(process.env.PRODUCTION_URL
                ? [
                    {
                        url: `${process.env.PRODUCTION_URL}/api/${process.env.API_VERSION || 'v1'}`,
                        description: 'Production Environment',
                    },
                ]
                : []),
        ],
        tags: [
            {
                name: 'Authentication',
                description: 'User login, logout, and token management',
            },
            {
                name: 'Products',
                description: 'Product catalog and inventory management',
            },
            {
                name: 'Orders',
                description: 'Sales transactions and order processing',
            },
            {
                name: 'Customers',
                description: 'Customer management and loyalty programs',
            },
            {
                name: 'Reports',
                description: 'Sales analytics and business intelligence',
            },
            {
                name: 'System',
                description: 'Health checks and system monitoring',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token for user authentication. Format: Bearer <token>',
                },
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API key for service-to-service communication',
                },
                basicAuth: {
                    type: 'http',
                    scheme: 'basic',
                    description: 'Basic authentication for administrative endpoints',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    required: ['success', 'message'],
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                            description: 'Indicates if the request was successful',
                        },
                        message: {
                            type: 'string',
                            example: 'An error occurred while processing your request',
                            description: 'Human-readable error message',
                        },
                        error: {
                            type: 'string',
                            example: 'ValidationError: Invalid input data',
                            description: 'Technical error details for debugging',
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string', example: 'price' },
                                    message: { type: 'string', example: 'Price must be greater than 0' },
                                },
                            },
                            description: 'Field-specific validation errors',
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                            description: 'When the error occurred',
                        },
                        requestId: {
                            type: 'string',
                            example: 'req_123456789',
                            description: 'Unique identifier for this request',
                        },
                    },
                },
                HealthCheck: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true,
                            description: 'Indicates if the service is healthy',
                        },
                        message: {
                            type: 'string',
                            example: 'POS System is operational',
                            description: 'Status message',
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                            description: 'Current server time',
                        },
                        uptime: {
                            type: 'number',
                            example: 86400,
                            description: 'Server uptime in seconds',
                        },
                        environment: {
                            type: 'string',
                            example: 'production',
                            enum: ['development', 'staging', 'production'],
                            description: 'Current environment',
                        },
                        version: {
                            type: 'string',
                            example: '2.5.0',
                            description: 'API version',
                        },
                        dependencies: {
                            type: 'object',
                            properties: {
                                database: {
                                    type: 'boolean',
                                    example: true,
                                    description: 'Database connection status',
                                },
                                cache: {
                                    type: 'boolean',
                                    example: true,
                                    description: 'Cache service status',
                                },
                                paymentGateway: {
                                    type: 'boolean',
                                    example: true,
                                    description: 'Payment gateway status',
                                },
                            },
                        },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        total: {
                            type: 'integer',
                            example: 150,
                            description: 'Total number of items',
                        },
                        page: {
                            type: 'integer',
                            example: 1,
                            description: 'Current page number',
                        },
                        limit: {
                            type: 'integer',
                            example: 20,
                            description: 'Items per page',
                        },
                        totalPages: {
                            type: 'integer',
                            example: 8,
                            description: 'Total number of pages',
                        },
                        hasNext: {
                            type: 'boolean',
                            example: true,
                            description: 'Whether there is a next page',
                        },
                        hasPrev: {
                            type: 'boolean',
                            example: false,
                            description: 'Whether there is a previous page',
                        },
                    },
                },
            },
            parameters: {
                pageParam: {
                    name: 'page',
                    in: 'query',
                    description: 'Page number for pagination',
                    required: false,
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        default: 1,
                    },
                },
                limitParam: {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of items per page',
                    required: false,
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 20,
                    },
                },
                sortParam: {
                    name: 'sort',
                    in: 'query',
                    description: 'Sort field and direction (e.g., "name:asc" or "price:desc")',
                    required: false,
                    schema: {
                        type: 'string',
                        default: 'createdAt:desc',
                    },
                },
            },
            responses: {
                UnauthorizedError: {
                    description: 'Authentication token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                        },
                    },
                },
                ForbiddenError: {
                    description: 'Insufficient permissions to access this resource',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                        },
                    },
                },
                NotFoundError: {
                    description: 'Requested resource was not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                        },
                    },
                },
                ValidationError: {
                    description: 'Invalid input data provided',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                        },
                    },
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        consumes: ['application/json'],
        produces: ['application/json'],
    },
    apis: [
        // Route files (TypeScript and JavaScript)
        './src/routes/**/*.ts',
        './src/routes/**/*.js',

        // Controller files (TypeScript and JavaScript)
        './src/controllers/**/*.ts',
        './src/controllers/**/*.js',

        // Model files for schema definitions
        './src/models/**/*.ts',
        './src/models/**/*.js',

        // DTO/Validation files
        './src/dto/**/*.ts',
        './src/dto/**/*.js',

        // Documentation helper files
        './src/docs/**/*.ts',
        './src/docs/**/*.js',

        // YAML/JSON OpenAPI spec files
        './src/docs/**/*.yaml',
        './src/docs/**/*.yml',
        './src/docs/**/*.json',
    ],
    explorer: true,  // Enable Swagger UI explorer
    customCss: '.swagger-ui .topbar { display: none }',  // Custom CSS for UI
    customSiteTitle: 'POS System API Documentation',
    swaggerOptions: {
        persistAuthorization: true,  // Persist authorization across page reloads
        displayRequestDuration: true,  // Show API request duration
        docExpansion: 'list',  // 'none', 'list', or 'full'
        filter: true,  // Enable search/filter box
        showExtensions: true,
        showCommonExtensions: true,
    },
};