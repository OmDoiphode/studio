# **App Name**: FaceAttend

## Core Features:

- User Authentication and Roles: Implement email/password login and registration for faculty and students using Firebase Authentication. Save user roles ('faculty' or 'student') to Firestore.
- Role-Based UI: Display different user interfaces based on the user's role (faculty or student).
- Class Creation: Allow faculty to create new classes, each with a unique, short, shareable code (e.g., a randomly generated string), and store it in Firestore.
- Student Enrollment: Enable faculty to manually enroll students by providing their name, roll number, and a face image and descriptor, stored as an array.
- Attendance Marking: Faculty can mark attendance using the device's camera. Use Google's ML Kit to detect and recognize faces and save the results into Firestore.
- Enrollment: Students can enroll in a class by entering the class code and providing their name, roll number, and a face image.
- Attendance History: When a student's face is recognized during attendance, update their attendance history in Firestore. Use a tool to export attendance data in spreadsheet.

## Style Guidelines:

- Primary color: Deep blue (#2962FF), providing a professional and trustworthy feel.
- Background color: Light gray (#F0F4F8), offering a clean and unobtrusive backdrop.
- Accent color: Bright orange (#FF9100), used sparingly to draw attention to important actions and interactive elements.
- Body and headline font: 'Inter', a sans-serif font, for a modern and neutral look suitable for both headlines and body text.
- Code font: 'Source Code Pro' for displaying the computer code.
- Use consistent and clear icons to represent actions and categories.
- Subtle animations to provide feedback on user interactions, such as button presses.