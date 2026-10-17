// Local development only. On Vercel the app is served from api/index.js
const app = require("./app");
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Class portal running on http://localhost:" + PORT));
