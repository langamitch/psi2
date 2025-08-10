// Student Data Import Script for Firebase
// This script shows how to import student data to Firebase Firestore

// Sample student data that would be imported
const studentData = [
    {
        studentId: "230829279",
        name: "Wandile Langa",
        email: "230829279@mywsu.ac.za",
        password: "testing", // This would be hashed in production
        modules: ["HCI2", "DES2", "TEP1", "INF2"]
    },
    {
        studentId: "230829280", 
        name: "Sarah Johnson",
        email: "230829280@mywsu.ac.za",
        password: "testing",
        modules: ["HCI2", "DES2", "TEP1", "INF2"]
    },
    {
        studentId: "230829281",
        name: "Michael Brown",
        email: "230829281@mywsu.ac.za", 
        password: "testing",
        modules: ["HCI2", "DES2", "TEP1", "INF2"]
    },
    {
        studentId: "230829282",
        name: "Emily Davis",
        email: "230829282@mywsu.ac.za",
        password: "testing", 
        modules: ["HCI2", "DES2", "TEP1", "INF2"]
    }
];

/*
To import this data to Firebase, you would:

1. Use Firebase Admin SDK in a Node.js environment:

const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function importStudents() {
    for (const student of studentData) {
        try {
            // Create Firebase Auth user
            const userRecord = await auth.createUser({
                email: student.email,
                password: student.password,
                displayName: student.name
            });

            // Create student profile in Firestore
            await db.collection('students').doc(userRecord.uid).set({
                studentId: student.studentId,
                name: student.name,
                email: student.email,
                modules: student.modules,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Imported student: ${student.name} (${student.studentId})`);
        } catch (error) {
            console.error(`Error importing ${student.name}:`, error);
        }
    }
}

// Run the import
importStudents();

2. Or use Firebase CLI with Firestore import:
   - Export data to JSON format
   - Use: firebase firestore:import ./student-data.json

3. Or manually add through Firebase Console:
   - Go to Firestore Database
   - Create 'students' collection
   - Add documents with student data
*/

// Example of the data structure in Firestore:
/*
/students/{userId}
{
    studentId: "S2021001",
    name: "John Smith", 
    email: "john.smith@student.edu",
    modules: ["HCI2", "DES2", "TEP1", "INF2"],
    createdAt: timestamp
}
*/

console.log('Student data ready for import:');
console.log(JSON.stringify(studentData, null, 2));
