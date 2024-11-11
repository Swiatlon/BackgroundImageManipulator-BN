import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { removeBackground } from '@imgly/background-removal-node';
import { Jimp } from 'jimp';

dotenv.config();

const app = express();
app.use(cors());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = 'uploads';
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'image.jpg');
    }
});

const upload = multer({ storage });

app.use(express.json());

const port = 5000;

app.get('/test', (req, res) => {
    res.json({ message: 'Hello from CORS-enabled server!' });
  });

app.post('/api/remove-background', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }
        const originalName = req.file.originalname;
        const extname = path.extname(originalName);  // e.g., '.jpg' or '.png'
        const basename = path.basename(originalName, extname);
        const processedImageBuffer = await removeBackground('./uploads/image.jpg');
        const buffer = Buffer.from(await processedImageBuffer.arrayBuffer());
        const processedImage = await Jimp.read(buffer);
        processedImage.background = req.body.bgColor;

        const finalImageBuffer = await processedImage.getBuffer('image/jpeg');
        const outputFilename = `${basename}-clean.jpg`;

        res.set('Content-Type', 'image/jpeg');
        res.set('Content-Disposition', `attachment; filename=${outputFilename}`);
        res.send(finalImageBuffer);

    } catch (error) {
        console.error('Error removing background:', error);
        res.status(500).json({ error: 'Error removing background: ' + error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
