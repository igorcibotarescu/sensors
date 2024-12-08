const Joi = require('joi');

const sensorDataValidationSchema = Joi.object({
    sensor_id: Joi.string().required().messages({
        'string.base': '"sensor_id" should be a string',
        'string.empty': '"sensor_id" cannot be empty',
        'any.required': '"sensor_id" is required'
    }),
    params: Joi.array().items(
        Joi.object({
            name: Joi.string().required().messages({
                'string.base': '"name" should be a string',
                'string.empty': '"name" cannot be empty',
                'any.required': '"name" is required'
            }),
            value: Joi.number().required().messages({
                'number.base': '"value" should be a number',
                'any.required': '"value" is required'
            }),
            units: Joi.string().required().messages({
                'string.base': '"units" should be a string',
                'string.empty': '"units" cannot be empty',
                'any.required': '"units" is required'
            })
        }).required()
    ).required().messages({
        'array.base': '"params" should be an array',
        'any.required': '"params" is required'
    })
});

module.exports = sensorDataValidationSchema;
