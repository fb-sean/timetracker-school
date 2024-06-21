const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const app = express();
const dotenv = require('dotenv');
dotenv.config();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'El1xaOVPozdobcUZfiibloafGKAymb0MwjB3GqXxNzGNkK!1' // Update with your environment variable
});

db.connect((err) => {
    if (err) {
        console.error('Fehler bei der Verbindung zur Datenbank:', err);
        return;
    }
    console.log('Verbindung zur Datenbank erfolgreich hergestellt.');

    db.query('CREATE DATABASE IF NOT EXISTS benutzerverwaltung', (err, result) => {
        if (err) {
            console.error('Fehler beim Erstellen der Datenbank:', err);
            return;
        }
        console.log('Datenbank benutzerverwaltung überprüft oder erstellt.');

        db.changeUser({database: 'benutzerverwaltung'}, (err) => {
            if (err) {
                console.error('Fehler beim Wechseln der Datenbank:', err);
                return;
            }

            const createMitarbeiterTableQuery = `
                CREATE TABLE IF NOT EXISTS mitarbeiter (
                    MA_ID INT PRIMARY KEY,
                    Nachname VARCHAR(255),
                    Vorname VARCHAR(255),
                    Geb_Datum DATE,
                    Tagesarbeitszeit INT
                );
            `;
            db.query(createMitarbeiterTableQuery, (err, result) => {
                if (err) {
                    console.error('Fehler beim Erstellen der mitarbeiter Tabelle:', err);
                } else {
                    console.log('Tabelle mitarbeiter überprüft oder erstellt.');
                }
            });

            const createFehlzeitenTableQuery = `
                CREATE TABLE IF NOT EXISTS fehlzeiten (
                    Fehlzeit_ID INT AUTO_INCREMENT PRIMARY KEY,
                    Employee_ID INT,
                    From_Date DATE,
                    Till_Date DATE,
                    Reason VARCHAR(255),
                    Missed_Days INT,
                    FOREIGN KEY (Employee_ID) REFERENCES mitarbeiter(MA_ID)
                );
            `;
            db.query(createFehlzeitenTableQuery, (err, result) => {
                if (err) {
                    console.error('Fehler beim Erstellen der fehlzeiten Tabelle:', err);
                } else {
                    console.log('Tabelle fehlzeiten überprüft oder erstellt.');
                }
            });

            const createHomeOfficeTableQuery = `
                CREATE TABLE IF NOT EXISTS HomeOffice (
                    MA_ID INT PRIMARY KEY,
                    HaveHomeOffice BOOLEAN
                );
            `;
            db.query(createHomeOfficeTableQuery, (err, result) => {
                if (err) {
                    console.error('Fehler beim Erstellen der HomeOffice Tabelle:', err);
                } else {
                    console.log('Tabelle HomeOffice überprüft oder erstellt.');
                }
            });
        });
    });
});

app.post('/saveMitarbeiter', upload.none(), (req, res) => {
    const {mitarbeiterID, nachname, vorname, geburtsdatum, arbeitstag} = req.body;

    const checkMitarbeiterQuery = 'SELECT * FROM mitarbeiter WHERE MA_ID = ?';
    db.query(checkMitarbeiterQuery, [mitarbeiterID], (err, results) => {
        if (err) {
            console.error('Fehler beim Überprüfen der Mitarbeiter-ID:', err);
            res.status(500).send('Fehler beim Überprüfen der Mitarbeiter-ID.');
        } else if (results.length > 0) {
            res.status(400).send('Mitarbeiter-ID existiert bereits.');
        } else {
            const query = 'INSERT INTO mitarbeiter (MA_ID, Nachname, Vorname, Geb_Datum, Tagesarbeitszeit) VALUES (?, ?, ?, ?, ?)';
            db.query(query, [parseInt(mitarbeiterID), nachname, vorname, geburtsdatum, arbeitstag], (err) => {
                if (err) {
                    console.error('Fehler beim Speichern des Mitarbeiters:', err);
                    res.status(500).send('Fehler beim Speichern des Mitarbeiters.');
                } else {
                    res.send('Mitarbeiter erfolgreich gespeichert.');
                }
            });
        }
    });
});

app.post('/saveFehlzeit', upload.none(), (req, res) => {
    const {mitarbeiterID, vonDatum, bisDatum, grund} = req.body;

    const checkMitarbeiterQuery = 'SELECT * FROM mitarbeiter WHERE MA_ID = ?';
    db.query(checkMitarbeiterQuery, [parseInt(mitarbeiterID)], (err, results) => {
        if (err) {
            console.error('Fehler beim Überprüfen der Mitarbeiter-ID:', err);
            res.status(500).send('Fehler beim Überprüfen der Mitarbeiter-ID.');
        } else if (results.length === 0) {
            res.status(400).send('Mitarbeiter-ID existiert nicht.');
        } else {
            const query = 'INSERT INTO fehlzeiten (Employee_ID, From_Date, Till_Date, Reason, Missed_Days) VALUES (?, ?, ?, ?, DATEDIFF(?, ?))';
            db.query(query, [mitarbeiterID, vonDatum, bisDatum, grund, bisDatum, vonDatum], (err) => {
                if (err) {
                    console.error('Fehler beim Speichern der Fehlzeit:', err);
                    res.status(500).send('Fehler beim Speichern der Fehlzeit.');
                } else {
                    res.send('Fehlzeit erfolgreich gespeichert.');
                }
            });
        }
    });
});

app.get('/list-fetch', (req, res) => {
    const getMitarbeiterQuery = `
        SELECT mitarbeiter.*, HomeOffice.HaveHomeOffice 
        FROM mitarbeiter
        LEFT JOIN HomeOffice ON mitarbeiter.MA_ID = HomeOffice.MA_ID
    `;
    const getFehlzeitenQuery = 'SELECT *, DATEDIFF(Till_Date, From_Date) AS MissedDays FROM fehlzeiten';

    db.query(getMitarbeiterQuery, (err, mitarbeiterResults) => {
        if (err) {
            console.error('Fehler beim Abrufen der Mitarbeiter:', err);
            res.status(500).send('Fehler beim Abrufen der Mitarbeiter.');
        } else {
            db.query(getFehlzeitenQuery, (err, fehlzeitenResults) => {
                if (err) {
                    console.error('Fehler beim Abrufen der Fehlzeiten:', err);
                    res.status(500).send('Fehler beim Abrufen der Fehlzeiten.');
                } else {
                    res.json({mitarbeiter: mitarbeiterResults, fehlzeiten: fehlzeitenResults});
                }
            });
        }
    });
});

app.post('/toggleHomeOffice/:id', (req, res) => {
    const ma_id = req.params.id;

    const checkHomeOfficeQuery = 'SELECT HaveHomeOffice FROM HomeOffice WHERE MA_ID = ?';
    db.query(checkHomeOfficeQuery, [ma_id], (err, results) => {
        if (err) {
            console.error('Fehler beim Überprüfen des Home Office Status:', err);
            res.status(500).send('Fehler beim Überprüfen des Home Office Status.');
        } else {
            const currentStatus = results.length > 0 ? results[0].HaveHomeOffice : false;
            const newStatus = !!!currentStatus;
            const updateHomeOfficeQuery = results.length > 0 ?
                'UPDATE HomeOffice SET HaveHomeOffice = ? WHERE MA_ID = ?' :
                'INSERT INTO HomeOffice (HaveHomeOffice, MA_ID) VALUES (?, ?)';

            db.query(updateHomeOfficeQuery, [newStatus, ma_id], (err) => {
                if (err) {
                    console.error('Fehler beim Umschalten des Home Office Status:', err);
                    res.status(500).send('Fehler beim Umschalten des Home Office Status.');
                } else {
                    res.json({status: newStatus});
                }
            });
        }
    });
});

app.delete('/deleteMitarbeiter/:id', (req, res) => {
    const ma_id = req.params.id;

    const deleteMitarbeiterQuery = 'DELETE FROM mitarbeiter WHERE MA_ID = ?';
    db.query(deleteMitarbeiterQuery, [ma_id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen des Mitarbeiters:', err);
            res.status(500).send('Fehler beim Löschen des Mitarbeiters.');
        } else {
            res.send('Mitarbeiter erfolgreich gelöscht.');
        }
    });
});

app.delete('/deleteFehlzeit/:id', (req, res) => {
    const fehlzeit_id = req.params.id;

    const deleteFehlzeitQuery = 'DELETE FROM fehlzeiten WHERE Fehlzeit_ID = ?';
    db.query(deleteFehlzeitQuery, [fehlzeit_id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Fehlzeit:', err);
            res.status(500).send('Fehler beim Löschen der Fehlzeit.');
        } else {
            res.send('Fehlzeit erfolgreich gelöscht.');
        }
    });
});

app.get('/', (req, res) => {
    return res.sendFile(__dirname + '/index.html');
});

app.get('/list', (req, res) => {
    return res.sendFile(__dirname + '/list.html');
});

app.listen(4564, () => {
    console.log('Server läuft auf Port 4564');
});
