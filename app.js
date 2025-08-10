
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, where, serverTimestamp, addDoc, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- Firebase Configuration ---
        // IMPORTANT: Replace with your actual Firebase project configuration.
        const firebaseConfig = {
    apiKey: "AIzaSyB7XFyQgYQtSR8MIiQ4gWRbwNUbnSYKe5s",
    authDomain: "hcitest-a31fe.firebaseapp.com",
    projectId: "hcitest-a31fe",
    storageBucket: "hcitest-a31fe.firebasestorage.app",
    messagingSenderId: "1077426886441",
    appId: "1:1077426886441:web:1e45dfc838b48e34f20938"
  };
        // --- Hardcoded Module Data ---
        const LECTURER_MODULES = [
            { id: 'HCI2', name: 'HCOMPUTER INTERACTION II', code: 'HCIII', colorClass: 'yellow' },
            { id: 'DES2', name: 'DEVELOPMENT SOFTWARE II', code: 'DESII', colorClass: 'blue' },
            { id: 'TEP1', name: 'TECHNICAL PROGRAMMING I', code: 'TEPI', colorClass: 'grey' },
            { id: 'INF2', name: 'INFORMATION SYSTEMS II', code: 'INFII', colorClass: 'purple' },
            { id: 'DEV1', name: 'DEVELOPMENT SOFTWARE I', code: 'DEVII', colorClass: 'sky' },
            { id: 'ITS1', name: 'INFORMATION TECHNOLOGY SKILLS I', code: 'ITSI', colorClass: 'lavender' },
            { id: 'DEV1_2', name: 'DEVELOPMENT SOFTWARE I', code: 'DEVI', colorClass: 'sage' },
            { id: 'INF1', name: 'INFORMATION SYSTEM I', code: 'INFI', colorClass: 'dark-blue' }
        ];


        // --- App Initialization ---
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        // --- Global State ---
        let currentUser = null;
        let activeListeners = [];
        let sessionTimerInterval = null;
        let currentModule = null;

        // --- DOM Elements ---
        const pages = {
            login: document.getElementById('loginPage'),
            dashboard: document.getElementById('dashboardPage'),
            liveSession: document.getElementById('liveSessionPage'),
            pastSessions: document.getElementById('pastSessionsPage'),
            pastSessionDetails: document.getElementById('pastSessionDetailsPage'),
        };
        
        const loginBtn = document.getElementById('loginButton');
        const logoutBtn = document.getElementById('logoutButton');
        const moduleListEl = document.getElementById('moduleList');
        // Live Session
        const liveSessionTitleEl = document.getElementById('liveSessionModuleTitle');
        const studentCountEl = document.getElementById('studentCount');
        const studentListEl = document.getElementById('studentList');
        const sessionPinEl = document.getElementById('sessionPin');
        const qrCodeContainerEl = document.getElementById('qrCode');
        const sessionTimerEl = document.getElementById('sessionTimer');
        const createSessionBtn = document.getElementById('createSessionButton');
        const endSessionBtn = document.getElementById('endSessionButton');
        const timeButtonsContainer = document.querySelector('.time-buttons');
        // Past Sessions
        const pastSessionsTitleEl = document.getElementById('pastSessionsTitle');
        const pastSessionsListEl = document.getElementById('pastSessionsList');
        // Past Session Details
        const pastSessionDetailsTitleEl = document.getElementById('pastSessionDetailsTitle');
        const pastSessionDetailsDateEl = document.getElementById('pastSessionDetailsDate');
        const pastSessionStudentListEl = document.getElementById('pastSessionStudentList');
        const backToPastSessionsBtn = document.getElementById('backToPastSessions');
        // Modal
        const activeSessionModal = document.getElementById('activeSessionModal');
        const modalCloseBtn = document.getElementById('modalCloseButton');
        const modalModuleTitle = document.getElementById('modalModuleTitle');
        const modalPin = document.getElementById('modalPin');
        const modalQrCode = document.getElementById('modalQrCode');

        // --- Page Navigation ---
        const showPage = (pageName) => {
            Object.values(pages).forEach(page => page.classList.add('hidden'));
            if (pages[pageName]) {
                pages[pageName].classList.remove('hidden');
            }
        };

        // --- Authentication ---
        onAuthStateChanged(auth, (user) => {
            cleanupListeners();
            if (user) {
                currentUser = user;
                document.getElementById('userIdDisplay').textContent = user.uid;
                setupDashboard();
                showPage('dashboard');
            } else {
                currentUser = null;
                document.getElementById('userIdDisplay').textContent = 'Not signed in';
                showPage('login');
            }
        });

        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginErrorEl = document.getElementById('loginError');
            loginErrorEl.textContent = '';
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                loginErrorEl.textContent = 'Invalid email or password.';
            }
        });

        logoutBtn.addEventListener('click', () => signOut(auth));

        // --- Dashboard Logic ---
        const setupDashboard = () => {
            if (!currentUser) return;
            moduleListEl.innerHTML = '';
            LECTURER_MODULES.forEach(module => {
                const card = createModuleCard(module);
                moduleListEl.appendChild(card);
                listenForActiveSession(module.id);
            });
        };
        
        const createModuleCard = (module) => {
            const card = document.createElement('div');
            card.className = 'module-card';
            if (module.colorClass) {
                card.classList.add(module.colorClass);
            }
            card.dataset.moduleId = module.id;
            card.dataset.moduleName = module.name;

            card.innerHTML = `
                <div class="card-content">
                    <h2>${module.name}</h2>
                    <p>${module.code}</p>
                </div>
                <div class="card-buttons">
                    <button class="btn btn-primary create-class-btn">Create Class</button>
                    <button class="btn btn-secondary view-past-btn">View Past</button>
                </div>
            `;
            
            card.querySelector('.create-class-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (card.querySelector('.card-active-indicator')) {
                    alert('A session is already active for this module. Click the card to view it.');
                    return;
                }
                currentModule = module;
                setupLiveSessionPage(module);
                showPage('liveSession');
            });
            
            card.querySelector('.view-past-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                currentModule = module;
                showPastSessions(module);
            });
            
            card.addEventListener('click', (e) => {
                 if (e.target.tagName === 'BUTTON') return;
                 if (card.querySelector('.card-active-indicator')) {
                    const sessionId = card.dataset.activeSessionId;
                    if(sessionId) showActiveSessionModal(sessionId);
                 }
            });

            return card;
        };

        // --- Session Logic ---
        const listenForActiveSession = (moduleId) => {
            const sessionsRef = collection(db, 'sessions');
            const q = query(sessionsRef, where("moduleId", "==", moduleId));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const card = document.querySelector(`.module-card[data-module-id="${moduleId}"]`);
                if (!card) return;

                const existingIndicator = card.querySelector('.card-active-indicator');
                if (existingIndicator) existingIndicator.remove();
                delete card.dataset.activeSessionId;

                const now = new Date();
                const activeSessionDoc = snapshot.docs.find(d => {
                    const data = d.data();
                    const expires = data.expiresAt && typeof data.expiresAt.toDate === 'function' ? data.expiresAt.toDate() : data.expiresAt;
                    return expires && new Date(expires).getTime() > now.getTime();
                });

                if (activeSessionDoc) {
                    const indicator = document.createElement('div');
                    indicator.className = 'card-active-indicator';
                    card.prepend(indicator);
                    card.dataset.activeSessionId = activeSessionDoc.id;
                }
            });
            activeListeners.push(unsubscribe);
        };
        
        const setupLiveSessionPage = (module) => {
            liveSessionTitleEl.textContent = module.name;
            studentListEl.innerHTML = '';
            studentCountEl.textContent = '0';
            sessionPinEl.textContent = '------';
            qrCodeContainerEl.innerHTML = '';
            createSessionBtn.classList.remove('hidden');
            endSessionBtn.classList.add('hidden');
            timeButtonsContainer.parentElement.classList.remove('hidden');
            sessionTimerEl.textContent = 'Expires in: --:--';
            
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            });
            document.querySelector('.time-btn[data-time="600"]').classList.add('btn-primary');
            document.querySelector('.time-btn[data-time="600"]').classList.remove('btn-secondary');
        };

        timeButtonsContainer.addEventListener('click', (e) => {
            if(e.target.classList.contains('time-btn')) {
                 document.querySelectorAll('.time-btn').forEach(btn => {
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                });
                e.target.classList.add('btn-primary');
                e.target.classList.remove('btn-secondary');
            }
        });

        createSessionBtn.addEventListener('click', async () => {
            if (!currentModule || !currentUser) return;
            
            const selectedTimeBtn = document.querySelector('.time-btn.btn-primary');
            const durationSeconds = parseInt(selectedTimeBtn.dataset.time, 10);
            const pin = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(new Date().getTime() + durationSeconds * 1000);

            try {
                const sessionRef = await addDoc(collection(db, 'sessions'), {
                    lecturerId: currentUser.uid,
                    moduleId: currentModule.id,
                    pin: pin,
                    createdAt: serverTimestamp(),
                    expiresAt: expiresAt
                });
                startSessionView(sessionRef.id, pin, expiresAt);
            } catch (error) {
                console.error("Error creating session:", error);
                alert("Could not create session. Please try again.");
            }
        });

        const startSessionView = (sessionId, pin, expiresAt) => {
             sessionPinEl.textContent = pin;
             qrCodeContainerEl.innerHTML = '';
             new QRCode(qrCodeContainerEl, { text: JSON.stringify({ sessionId, pin }), width: 180, height: 180 });
             createSessionBtn.classList.add('hidden');
             endSessionBtn.classList.remove('hidden');
             endSessionBtn.dataset.sessionId = sessionId;
             timeButtonsContainer.parentElement.classList.add('hidden');
             startTimer(expiresAt);
             listenForSubmissions(sessionId);
        };
        
        endSessionBtn.addEventListener('click', async (e) => {
            if(confirm("Are you sure you want to end this session early?")) {
                const sessionRef = doc(db, 'sessions', e.target.dataset.sessionId);
                await updateDoc(sessionRef, { expiresAt: new Date() });
                showPage('dashboard');
            }
        });

        const startTimer = (expiresAt) => {
            if (sessionTimerInterval) clearInterval(sessionTimerInterval);
            sessionTimerInterval = setInterval(() => {
                const distance = expiresAt.getTime() - new Date().getTime();
                if (distance < 0) {
                    clearInterval(sessionTimerInterval);
                    sessionTimerEl.innerHTML = "<strong>Session Expired</strong>";
                    if(!pages.liveSession.classList.contains('hidden')) {
                        alert("Session has expired.");
                        showPage('dashboard');
                    }
                    return;
                }
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                sessionTimerEl.innerHTML = `Expires in: <strong>${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</strong>`;
            }, 1000);
            activeListeners.push({ unsubscribe: () => clearInterval(sessionTimerInterval) });
        };
        
        const listenForSubmissions = (sessionId) => {
            const q = query(collection(db, 'sessions', sessionId, 'registrations'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                studentListEl.innerHTML = '';
                studentCountEl.textContent = snapshot.size;
                snapshot.forEach(doc => {
                    const { studentName, timestamp } = doc.data();
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="list-item-main">${studentName || 'Anonymous'}</span> <span class="list-item-sub">${timestamp?.toDate().toLocaleTimeString() || ''}</span>`;
                    studentListEl.prepend(li);
                });
            });
            activeListeners.push(unsubscribe);
        };

        // --- Past Sessions Logic ---
        const showPastSessions = async (module) => {
            pastSessionsTitleEl.textContent = `Past Sessions: ${module.name}`;
            pastSessionsListEl.innerHTML = '<li>Loading...</li>';
            showPage('pastSessions');

            const sessionsRef = collection(db, 'sessions');
            const q = query(sessionsRef, where("moduleId", "==", module.id));

            const querySnapshot = await getDocs(q);
            pastSessionsListEl.innerHTML = '';
            if (querySnapshot.empty) {
                pastSessionsListEl.innerHTML = '<li>No past sessions found.</li>';
                return;
            }

            const now = new Date();
            const sessions = querySnapshot.docs
                .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
                .filter(s => {
                    const expires = s.expiresAt && typeof s.expiresAt.toDate === 'function' ? s.expiresAt.toDate() : new Date(s.expiresAt);
                    return expires && new Date(expires).getTime() < now.getTime();
                })
                .sort((a, b) => {
                    const aExp = a.expiresAt && typeof a.expiresAt.toDate === 'function' ? a.expiresAt.toDate() : new Date(a.expiresAt);
                    const bExp = b.expiresAt && typeof b.expiresAt.toDate === 'function' ? b.expiresAt.toDate() : new Date(b.expiresAt);
                    return bExp.getTime() - aExp.getTime();
                });

            if (sessions.length === 0) {
                pastSessionsListEl.innerHTML = '<li>No past sessions found.</li>';
                return;
            }

            for (const session of sessions) {
                const registrationsRef = collection(db, 'sessions', session.id, 'registrations');
                const registrationsSnap = await getDocs(registrationsRef);
                
                const li = document.createElement('li');
                li.className = 'list-item-clickable';
                const createdAtDate = session.createdAt && typeof session.createdAt.toDate === 'function' ? session.createdAt.toDate() : new Date(session.createdAt);
                li.innerHTML = `
                    <div>
                        <div class="list-item-main">${createdAtDate.toLocaleDateString()}</div>
                        <div class="list-item-sub">${registrationsSnap.size} student(s) registered</div>
                    </div>
                    <span class="list-item-arrow">&rarr;</span>
                `;
                li.addEventListener('click', () => showPastSessionDetails(session, module.name));
                pastSessionsListEl.appendChild(li);
            }
        };
        
        const showPastSessionDetails = async (session, moduleName) => {
            pastSessionDetailsTitleEl.textContent = moduleName;
            const createdAtDate = session.createdAt && typeof session.createdAt.toDate === 'function' ? session.createdAt.toDate() : new Date(session.createdAt);
            pastSessionDetailsDateEl.textContent = `Registered Students for ${createdAtDate.toLocaleString()}`;
            pastSessionStudentListEl.innerHTML = '<li>Loading...</li>';
            showPage('pastSessionDetails');
            
            const registrationsRef = collection(db, 'sessions', session.id, 'registrations');
            const q = query(registrationsRef, orderBy("timestamp", "asc"));
            const snapshot = await getDocs(q);
            
            pastSessionStudentListEl.innerHTML = '';
            if (snapshot.empty) {
                pastSessionStudentListEl.innerHTML = '<li>No students registered for this session.</li>';
                return;
            }
            
            snapshot.forEach(doc => {
                const { studentName, timestamp } = doc.data();
                const li = document.createElement('li');
                const ts = timestamp && typeof timestamp.toDate === 'function' ? timestamp.toDate().toLocaleTimeString() : '';
                li.innerHTML = `<span class="list-item-main">${studentName}</span><span class="list-item-sub">${ts}</span>`;
                pastSessionStudentListEl.appendChild(li);
            });
        };

        // --- Modal Logic ---
        const showActiveSessionModal = async (sessionId) => {
            const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
            if (sessionDoc.exists()) {
                const sessionData = sessionDoc.data();
                const module = LECTURER_MODULES.find(m => m.id === sessionData.moduleId);
                modalModuleTitle.textContent = module ? module.name : 'Active Session';
                modalPin.textContent = sessionData.pin;
                modalQrCode.innerHTML = '';
                new QRCode(modalQrCode, { text: JSON.stringify({ sessionId, pin: sessionData.pin }), width: 200, height: 200 });
                activeSessionModal.classList.remove('hidden');
            }
        };
        
        modalCloseBtn.addEventListener('click', () => activeSessionModal.classList.add('hidden'));
        activeSessionModal.addEventListener('click', (e) => {
            if (e.target === activeSessionModal) {
                 activeSessionModal.classList.add('hidden');
            }
        });

        // --- Navigation & Cleanup ---
        document.querySelectorAll('.back-to-dashboard').forEach(btn => {
            btn.addEventListener('click', () => {
                if (sessionTimerInterval) clearInterval(sessionTimerInterval);
                showPage('dashboard');
            });
        });
        
        backToPastSessionsBtn.addEventListener('click', () => {
            showPastSessions(currentModule);
        });

        const cleanupListeners = () => {
            activeListeners.forEach(l => typeof l.unsubscribe === 'function' ? l.unsubscribe() : l());
            activeListeners = [];
        };

        // --- Initial Load ---
        showPage('login');

        