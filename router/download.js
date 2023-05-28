const router = require("express").Router();
const ytdl = require("ytdl-core");
const fs = require("fs");
const sanitize = require("sanitize-filename");
const ytpl = require("ytpl");

const os = require('os');
const path = require('path');

router.post("/video", async (req, res) => {
  const { url } = req.body;

  try {
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(url);
    const videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });

    const sanitizedTitle = sanitize(info.videoDetails.title);
    const fileName = `${sanitizedTitle}.mp4`;

    const filePath = path.join(os.tmpdir(), fileName);

    const fileStream = fs.createWriteStream(filePath);

    fileStream.on('finish', () => {
      const errorHandler = (err) => {
        console.error('Error:', err.message);
        res.status(500).json({ error: 'An error occurred' });
      };

      const downloadStream = send(req, filePath, { headers: { 'Content-Disposition': `attachment; filename="${fileName}"` } });
      downloadStream.on('error', errorHandler);
      downloadStream.on('end', () => {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error:', err.message);
          }
        });
      });

      // Track the number of bytes sent
      let bytesSent = 0;
      downloadStream.on('data', (chunk) => {
        bytesSent += chunk.length;
      });

      // Add bytesSent to the response header
      res.setHeader('Content-Length', info.videoDetails.lengthSeconds);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Content-Length', bytesSent);

      downloadStream.pipe(res);
    });

    ytdl(url, { format: videoFormat }).pipe(fileStream);

    req.on('aborted', () => {
      fileStream.destroy();
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred' });
  }
});


router.post("/audio", async (req, res) => {

  const { url, localFilePath } = req.body;

  try {

    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const info = await ytdl.getInfo(url);
    const audioFormat = ytdl.chooseFormat(info.formats, {
      filter: "audioonly",
    });

    const sanitizedTitle = sanitize(info.videoDetails.title);
    const fileName = `${sanitizedTitle}.mp3`;

    const directory = localFilePath;
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }

    const filePath = `${directory}/${fileName}`;

    ytdl(url, { format: audioFormat })
      .pipe(fs.createWriteStream(filePath))
      .on("finish", () => {
        res.download(filePath, (err) => {
          if (err) {
            console.error(err);
            res.status(500).json({ error: "An error occurred" });
          }
        });
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred" });
  }
});

router.post("/playlist", async (req, res) => {
  const { playlistUrl, localFilePath } = req.body;


  try {
    const playlist = await ytpl(playlistUrl);

    const playlistTitle = playlist.title;
    const videos = playlist.items;
    const directory = localFilePath;

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }

    const sanitizedPlaylistTitle = sanitize(playlistTitle);
    const playlistDirectory = `${directory}/${sanitizedPlaylistTitle}`;

    if (!fs.existsSync(playlistDirectory)) {
      fs.mkdirSync(playlistDirectory);
    }

    for (const video of videos) {
      const videoUrl = video.url;
      const info = await ytdl.getInfo(videoUrl);
      const videoFormat = ytdl.chooseFormat(info.formats, {
        quality: "highest",
      });
      const sanitizedVideoTitle = sanitize(info.videoDetails.title);
      const fileName = `${sanitizedVideoTitle}.mp4`;
      const filePath = `${playlistDirectory}/${fileName}`;

      const fileStream = fs.createWriteStream(filePath);

      await new Promise((resolve, reject) => {
        ytdl(videoUrl, { format: videoFormat })
          .pipe(fileStream)
          .on("finish", resolve)
          .on("error", reject);
      });
    }

    res.json({ message: "Playlist downloaded successfully" });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to download playlist" });
  }
});
module.exports = router;
