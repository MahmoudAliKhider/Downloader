const express = require("express");

const app = express();
app.use(express.json());

app.use("/api/download", require("./router/download"));

const port = 3000;
app.listen(port, () => {
  console.log(`server connected to http://localhost:${port}`);
});
