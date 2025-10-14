const YAML = require('yamljs');
const path = require('path');

// Load swagger.yaml file
const swaggerDocument = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));

module.exports = swaggerDocument;
