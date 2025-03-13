const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');
const algosdk = require('algosdk');
const algokit = require('@algorandfoundation/algokit-utils');
const fs = require('fs');

// Initialize the express app
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
}));

// Set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create Algorand client - using AlgoNode for testnet
const algodClient = new algosdk.Algodv2(
  '', // Empty API key 
  'https://testnet-api.algonode.cloud', 
  ''
);

// Mock StorageOrderClient for the price estimation
// This simplifies the implementation since we don't need the full client functionality
class MockStorageOrderClient {
  constructor() {
    // Default parameters based on testnet values
    this.basePrice = 250000; // 0.25 Algos base price
    this.bytePrice = 100;    // 100 microAlgos per KB
    this.permanentMultiplier = 5; // 5x multiplier for permanent storage
  }

  compose() {
    return {
      getPrice: ({ size, is_permanent }) => {
        return {
          atc: async () => {
            return {
              simulate: async () => {
                // Calculate price based on size and storage type
                const sizeInKB = Math.ceil(size / 1024);
                const basePrice = this.basePrice;
                const byteCost = sizeInKB * this.bytePrice;
                let totalPrice = basePrice + byteCost;
                
                // Apply multiplier for permanent storage
                if (is_permanent) {
                  totalPrice *= this.permanentMultiplier;
                }
                
                return {
                  methodResults: [
                    {
                      returnValue: {
                        valueOf: () => totalPrice
                      }
                    }
                  ]
                };
              }
            };
          }
        };
      }
    };
  }
}

// Import the getPrice function from the example codebase
async function getPrice(algod, appClient, size, isPermanent = false) {
  try {
    const result = await (await appClient.compose().getPrice({ size, is_permanent: isPermanent }).atc()).simulate(algod);
    return result.methodResults[0].returnValue?.valueOf();
  } catch (error) {
    console.error('Error getting price:', error);
    throw error;
  }
}

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// Calculate price route
app.post('/calculate-price', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const fileSize = file.size;
    const isPermanent = req.body.isPermanent === 'true';

    try {
      // Use the mock client for price estimation
      const appClient = new MockStorageOrderClient();

      // Get the price
      const price = await getPrice(algodClient, appClient, fileSize, isPermanent);
      
      // Convert microAlgos to Algos for display
      const priceInAlgos = price / 1000000;
      
      res.json({ 
        success: true, 
        fileSize, 
        price, 
        priceInAlgos,
        isPermanent 
      });
    } catch (error) {
      console.error('Error in price calculation:', error);
      res.status(500).json({ 
        error: 'Error calculating price', 
        message: error.message,
        fileSize 
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 