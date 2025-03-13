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

// Default pricing parameters
const DEFAULT_BASE_PRICE = 250000; // 0.25 Algos base price
const DEFAULT_BYTE_PRICE = 100;    // 100 microAlgos per KB
const DEFAULT_PERMANENT_MULTIPLIER = 5; // 5x multiplier for permanent storage

// Mock StorageOrderClient for the price estimation
// This simplifies the implementation since we don't need the full client functionality
class MockStorageOrderClient {
  constructor(basePrice, bytePrice, permanentMultiplier) {
    // Parameters based on testnet values or custom values
    this.basePrice = basePrice || DEFAULT_BASE_PRICE;
    this.bytePrice = bytePrice || DEFAULT_BYTE_PRICE;
    this.permanentMultiplier = permanentMultiplier || DEFAULT_PERMANENT_MULTIPLIER;
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
                
                // Debug per verificare il valore di is_permanent
                console.log('In MockStorageOrderClient, is_permanent:', is_permanent);
                console.log('typeof is_permanent:', typeof is_permanent);
                console.log('Base total price before multiplier:', totalPrice);
                
                // Apply multiplier for permanent storage
                if (is_permanent) {
                  totalPrice *= this.permanentMultiplier;
                  console.log('Applied permanent multiplier:', this.permanentMultiplier);
                } else {
                  console.log('No multiplier applied, using temporary storage');
                }
                
                console.log('Final total price:', totalPrice);
                
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
    console.log('getPrice called with isPermanent:', isPermanent);
    console.log('typeof isPermanent:', typeof isPermanent);
    
    const result = await (await appClient.compose().getPrice({ size, is_permanent: isPermanent }).atc()).simulate(algod);
    
    const price = result.methodResults[0].returnValue?.valueOf();
    console.log('Calculated price:', price);
    
    return price;
  } catch (error) {
    console.error('Error getting price:', error);
    throw error;
  }
}

// Home route
app.get('/', (req, res) => {
  res.render('index', {
    defaultBasePrice: DEFAULT_BASE_PRICE,
    defaultBytePrice: DEFAULT_BYTE_PRICE,
    defaultPermanentMultiplier: DEFAULT_PERMANENT_MULTIPLIER
  });
});

// Calculate price route
app.post('/calculate-price', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const fileSize = file.size;
    
    // Debug per vedere esattamente cosa arriva dal client
    console.log('req.body.isPermanent:', req.body.isPermanent);
    console.log('typeof req.body.isPermanent:', typeof req.body.isPermanent);
    
    // Gestione migliorata per determinare se il checkbox è selezionato
    // Accetta qualsiasi valore truthy o la stringa 'true'
    const isPermanent = req.body.isPermanent === 'true' || 
                         req.body.isPermanent === 'on' || 
                         req.body.isPermanent === true;
    
    console.log('isPermanent after check:', isPermanent);
    
    // Get custom price parameters if provided
    const basePrice = parseInt(req.body.basePrice) || DEFAULT_BASE_PRICE;
    const bytePrice = parseInt(req.body.bytePrice) || DEFAULT_BYTE_PRICE;

    try {
      // Use the mock client for price estimation with custom parameters
      const appClient = new MockStorageOrderClient(basePrice, bytePrice);

      // Get the price
      const price = await getPrice(algodClient, appClient, fileSize, isPermanent);
      
      // Convert microAlgos to Algos for display
      const priceInAlgos = price / 1000000;
      
      // Return the calculation breakdown as well
      const sizeInKB = Math.ceil(fileSize / 1024);
      const byteCost = sizeInKB * bytePrice;
      const baseTotal = basePrice + byteCost;
      const permanentMultiplier = isPermanent ? DEFAULT_PERMANENT_MULTIPLIER : 1;
      
      res.json({ 
        success: true, 
        fileSize,
        sizeInKB, 
        basePrice,
        bytePrice,
        byteCost,
        baseTotal,
        permanentMultiplier,
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