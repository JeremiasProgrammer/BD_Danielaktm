const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const cors = require("cors");
const app = express();
const PORT = 3000;

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );
    next();
});

app.use(
    cors({
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "DELETE"],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "views")));
app.use("/imagenes", express.static(path.join(__dirname, "imagenes")));

// BD
const db = new sqlite3.Database("./BD/regalos.db", (err) => {
    if (err) {
        console.error("Error al conectar con la base de datos:", err.message);
    } else {
        console.log("Conectado a la base de datos SQLite");
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS regalos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    img TEXT NOT NULL
    )
`);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "imagenes"));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

app.get("/api/regalos", (req, res) => {
    db.all("SELECT * FROM regalos", [], (err, rows) => {
        if (err) {
            return res
                .status(500)
                .json({ error: "Error al obtener los regalos" });
        }
        res.json({ data: rows });
    });
});

app.get("/api/regalos/:id", (req, res) => {
    const id = req.params.id;

    if (isNaN(id)) {
        return res.status(400).json({ error: "ID debe ser un número válido" });
    }

    db.get("SELECT * FROM regalos WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res
                .status(500)
                .json({ error: "Error al obtener el regalo" });
        } else if (!row) {
            return res.status(404).json({ error: "Regalo no encontrado" });
        } else {
            return res.json({ data: row });
        }
    });
});

app.get("/add-regalo", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "add-regalo.html"));
});

app.post("/api/regalos", upload.single("img"), (req, res) => {
    const { nombre, descripcion } = req.body;
    const img = req.file ? req.file.filename : null;

    if (!nombre || !descripcion || !img) {
        return res.status(400).json({ error: "Faltan datos" });
    }

    const checkQuery = "SELECT * FROM regalos WHERE nombre = ?";
    db.get(checkQuery, [nombre], (err, row) => {
        if (err) {
            return res
                .status(500)
                .json({ error: "Error al verificar el regalo" });
        }

        if (row) {
            return res.status(400).json({ error: "Este regalo ya existe" });
        }

        const query =
            "INSERT INTO regalos (nombre, descripcion, img) VALUES (?, ?, ?)";
        db.run(query, [nombre, descripcion, img], function (err) {
            if (err) {
                return res
                    .status(500)
                    .json({ error: "Error al agregar el regalo" });
            } else {
                res.status(201).json({
                    id: this.lastID,
                    nombre,
                    descripcion,
                    img,
                });
            }
        });
    });
});

app.delete("/api/regalos/:id", (req, res) => {
    const id = req.params.id;

    if (isNaN(id)) {
        return res.status(400).json({ error: "ID debe ser un número válido" });
    }

    db.run("DELETE FROM regalos WHERE id = ?", [id], function (err) {
        if (err) {
            return res
                .status(500)
                .json({ error: "Error al eliminar el regalo" });
        } else if (this.changes === 0) {
            return res.status(404).json({ error: "Regalo no encontrado" });
        } else {
            return res.json({ message: "Regalo eliminado con éxito" });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
