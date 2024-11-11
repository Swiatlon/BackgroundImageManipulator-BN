import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { removeBackground } from '@imgly/background-removal-node';
import { Jimp } from 'jimp';

dotenv.config();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
app.use(cors({
    origin: process.env.FRONT_END_ADDRESS,
    exposedHeaders: ['Content-Disposition']
}));

app.use(express.json());

const port = 5000;

app.post('/api/remove-background', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        const { bgColor = '#ffffff' } = req.body;
        const originalName = req.file.originalname;
        const extname = path.extname(originalName);  // e.g., '.jpg' or '.png'
        const basename = path.basename(originalName, extname);  // e.g., 'test' or 'photo'

        // Read the uploaded image
        const uploadedImage = await Jimp.read(req.file.buffer);
        const buffer = await uploadedImage.getBuffer(`image/${extname === '.jpg' ? 'jpeg' : 'png'}`);

        // Save the image temporarily
        const tempFilePath = path.join(`${basename}.${extname}`);
        fs.writeFileSync(tempFilePath, buffer);

        // Remove background using the service
        const result = await removeBackground(tempFilePath);
        fs.unlinkSync(tempFilePath); // Clean up the temp file

        const processedImage = await Jimp.read(await result.arrayBuffer());

        if (bgColor) {
          processedImage.background = bgColor;
        }

        // Convert the resulting image to JPG (or you can change to PNG if needed)
        const processedBuffer = await processedImage.getBuffer('image/jpeg');

        // Prepare the output filename (use '-clean' as part of the filename)
        const outputFilename = `${basename}-clean.jpg`;

        // Set the response headers for downloading the processed file
        res.set('Content-Type', 'image/jpeg');
        res.set('Content-Disposition', `attachment; filename=${outputFilename}`);
        res.send(processedBuffer); // Send the processed image buffer

    } catch (error) {
        console.error('Error removing background:', error);
        res.status(500).json({ error: 'Error removing background: ' + error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
