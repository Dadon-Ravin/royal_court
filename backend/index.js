require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors()); // Enable CORS
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }, // Allow all origins (update in production)
});

// Supabase setup
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Socket.IO logic
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle room creation/joining
    socket.on("join_room", async (roomId) => {
        socket.join(roomId);
        // Fetch game state from Supabase if room exists
        const { data } = await supabase
            .from("games")
            .select("*")
            .eq("room_id", roomId)
            .single();
        if (data) socket.emit("game_state", data.game_state);
    });

    // Handle game actions (e.g., playing a card)
    socket.on("play_card", async (data) => {
        // Validate the move here (anti-cheat logic)
        // Broadcast the move to all players in the room
        io.to(data.roomId).emit("card_played", data);
        // Update Supabase with the new game state
        await supabase
            .from("games")
            .upsert({ room_id: data.roomId, game_state: data.newState });
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));