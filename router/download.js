const router = require("express").Router();
const ytdl = require("ytdl-core");
const fs = require("fs");
const sanitize = require("sanitize-filename");
const ytpl = require("ytpl");

router.post("/video", async (req, res) => {
  try {
    const url = req.body.url;

    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL " });
    }

    const info = await ytdl.getInfo(url);
    const videoFormat = ytdl.chooseFormat(info.formats, { quality: "highest" });

    const sanitizedTitle = sanitize(info.videoDetails.title);
    const fileName = `${sanitizedTitle}.mp4`;

    const directory = "D:/download/video";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync("./Download-video");
    }

    ytdl(url, { format: videoFormat }).pipe(res);

    const filePath = `${directory}/${fileName}`;
    const fileStream = fs.createWriteStream(filePath);

    ytdl(url, { format: videoFormat }).pipe(fileStream);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred" });
  }
});

router.post("/audio", async (req, res) => {
  try {
    const url = req.body.url;

    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const info = await ytdl.getInfo(url);
    const audioFormat = ytdl.chooseFormat(info.formats, {
      filter: "audioonly",
    });

    const sanitizedTitle = sanitize(info.videoDetails.title);
    const fileName = `${sanitizedTitle}.mp3`;

    const directory = "D:/download/audio";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync("./Download-audio");
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
  const playlistUrl = req.body.url;

  try {
    const playlist = await ytpl(playlistUrl);

    const playlistTitle = playlist.title;
    const videos = playlist.items;
    const directory = "D:/download/playlist";

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
