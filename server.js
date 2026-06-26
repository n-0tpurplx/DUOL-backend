import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// temporary single-user storage (upgrade later)
let user = {
access_token: null,
refresh_token: null,
xp: 0,
level: 1
};

// --------------------
// STRAVA LOGIN START
// --------------------
app.get("/auth", (req, res) => {
const url =
`https://www.strava.com/oauth/authorize?client_id=${process.env.CLIENT_ID}` +
`&response_type=code&redirect_uri=${process.env.REDIRECT_URI}` +
`&approval_prompt=auto&scope=activity:read_all`;

res.redirect(url);
});

// --------------------
// CALLBACK
// --------------------
app.get("/callback", async (req, res) => {
try {
const code = req.query.code;

const tokenRes = await axios.post(
"https://www.strava.com/oauth/token",
{
client_id: process.env.CLIENT_ID,
client_secret: process.env.CLIENT_SECRET,
code,
grant_type: "authorization_code"
}
);

user.access_token = tokenRes.data.access_token;
user.refresh_token = tokenRes.data.refresh_token;

res.send("Connected to Strava. You can close this tab.");
} catch (err) {
console.log(err.message);
res.send("Auth failed");
}
});

// --------------------
// FETCH ACTIVITIES
// --------------------
async function fetchActivities(){
if(!user.access_token) return [];

const res = await axios.get(
"https://www.strava.com/api/v3/athlete/activities",
{
headers: {
Authorization: `Bearer ${user.access_token}`
}
}
);

return res.data;
}

// --------------------
// XP SYSTEM
// --------------------
function calculateXP(activities){
let xp = 0;

for(const a of activities){
const km = a.distance / 1000;
const minutes = a.moving_time / 60;

xp += km * 10;        // distance
xp += minutes * 0.3;  // time bonus
}

return Math.floor(xp);
}

// --------------------
// STATUS ENDPOINT
// --------------------
app.get("/status", async (req, res) => {
try {
const activities = await fetchActivities();

const xp = calculateXP(activities);

user.xp = xp;
user.level = Math.floor(xp / 100) + 1;

res.json({
xp: user.xp,
level: user.level,
activities: activities.length
});
} catch (err) {
res.json({ error: "failed to fetch data" });
}
});

app.listen(PORT, () => {
console.log("Server running on", PORT);
});
