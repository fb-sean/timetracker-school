const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({extended: true}));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'benutzerverwaltung'
});

db.connect((err) => {
    if (err) {
        console.error('Fehler bei der Verbindung zur Datenbank:', err);
    } else {
        console.log('Verbindung zur Datenbank erfolgreich hergestellt.');
    }
});

app.post('/saveMitarbeiter', (req, res) => {
    const {mitarbeiterID, nachname, vorname, geburtsdatum, arbeitstag} = req.body;
    const query = 'INSERT INTO mitarbeiter (MA_ID, Nachname, Vorname, Geb_Datum, Tagesarbeitszeit) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [mitarbeiterID, nachname, vorname, geburtsdatum, arbeitstag], (err) => {
        if (err) {
            console.error('Fehler beim Speichern des Mitarbeiters:', err);
            res.status(500).send('Fehler beim Speichern des Mitarbeiters.');
        } else {
            res.send('Mitarbeiter erfolgreich gespeichert.');
        }
    });
});

app.post('/saveFehlzeit', (req, res) => {
    const {fehlzeitID, vonDatum, bisDatum, grund} = req.body;
    const query = 'INSERT INTO fehlzeit (FZ_ID, Von_Datum, Bis_Datum, Grund) VALUES (?, ?, ?, ?)';
    db.query(query, [fehlzeitID, vonDatum, bisDatum, grund], (err) => {
        if (err) {
            console.error('Fehler beim Speichern der Fehlzeit:', err);
            res.status(500).send('Fehler beim Speichern der Fehlzeit.');
        } else {
            res.send('Fehlzeit erfolgreich gespeichert.');
        }
    });
});

app.get('/', (req, res) => {
    return res.sendFile(__dirname + '/index.html');
});

app.listen(4564, () => {
    console.log('Server läuft auf Port 3000');
});
