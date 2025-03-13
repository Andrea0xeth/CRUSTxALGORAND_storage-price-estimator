# Algorand Storage Price Estimator

This application allows you to estimate the cost of storing files on the Algorand blockchain using the Crust storage protocol. Simply upload a file, specify if you want permanent or temporary storage, and get an instant price estimate.

## Features

- Upload files to estimate storage costs
- Calculate costs for both temporary and permanent storage
- Display prices in both microAlgos and Algos
- User-friendly web interface

## Requirements

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Usage

1. Start the application:

```bash
npm start
```

2. Open your browser and go to http://localhost:3000
3. Upload a file and choose your storage options
4. View the estimated storage cost

## How It Works

The application uses the following components:

- **Express.js**: Web server framework
- **EJS**: Template engine for the frontend
- **Algorand SDK**: To interact with the Algorand blockchain
- **AlgoKit Utils**: Utility functions for Algorand development

The price estimation is calculated using the `getPrice` function from the Crust storage protocol, which simulates the cost without actually uploading the file or making any blockchain transactions.

## Development

To run the application in development mode with auto-restart:

```bash
npm run dev
```

## Notes

- This is a price estimation tool only. It does not actually upload files to the blockchain.
- The application uses Algorand TestNet for price calculations.
- Actual prices may vary based on current network conditions and pricing parameters. 