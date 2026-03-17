export default {
  async fetch(request) {
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>V-Call Pro Final</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <style>
            .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.1); }
            video { width: 100%; border-radius: 1.5rem; object-fit: cover; background: #000; transition: transform 0.3s ease; }
            #video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; padding: 20px; }
            .self-view { transform: scaleX(-1); border: 3px solid #3b82f6; }
        </style>
    </head>
    <body class="bg-[#020617] text-slate-100 font-sans min-h-screen">

        <div id="auth-section" class="flex items-center justify-center min-h-screen p-6">
            <div class="glass p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl">
                <div class="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/40">
                    <i data-lucide="video" class="w-10 h-10 text-white"></i>
                </div>
                <h2 class="text-3xl font-black text-center mb-2">V-Call Pro</h2>
                <p class="text-slate-400 text-center mb-8 text-sm">HD Group Video Call • Parallel • Screen Share</p>
                <div class="space-y-4">
                    <input id="user" type="text" placeholder="Username" class="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 outline-none focus:border-blue-500 transition">
                    <input id="pass" type="password" placeholder="Password" class="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 outline-none focus:border-blue-500 transition">
                    <input id="room" type="text" placeholder="Room ID (Contoh: Mabar)" class="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 outline-none focus:border-blue-500 transition">
                </div>
                <div class="grid grid-cols-2 gap-4 mt-8">
                    <button onclick="startApp('login')" class="bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-bold transition">Login</button>
                    <button onclick="startApp('register')" class="bg-slate-800 hover:bg-slate-700 p-4 rounded-2xl font-bold transition">Daftar</button>
                </div>
            </div>
        </div>

        <div id="call-section" class="hidden flex flex-col h-screen">
            <header class="p-6 flex justify-between items-center glass m-4 rounded-3xl">
                <div class="flex items-center gap-3">
                    <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="font-bold">Room: <span id="room-name" class="text-blue-400"></span></span>
                </div>
                <button onclick="location.reload()" class="bg-red-500/20 text-red-400 px-6 py-2 rounded-full font-bold hover:bg-red-500 hover:text-white transition">Keluar</button>
            </header>

            <main id="video-grid" class="flex-1 overflow-y-auto"></main>

            <footer class="p-8 flex justify-center items-center gap-4 glass m-4 rounded-[3rem]">
                <button onclick="toggleTrack('audio')" class="p-5 bg-slate-800 rounded-full hover:bg-slate-700 transition"><i data-lucide="mic"></i></button>
                <button onclick="toggleTrack('video')" class="p-5 bg-slate-800 rounded-full hover:bg-slate-700 transition"><i data-lucide="video"></i></button>
                <button onclick="toggleScreenShare()" id="btn-screen" class="p-5 bg-slate-800 rounded-full hover:bg-blue-600 transition"><i data-lucide="monitor-up"></i></button>
            </footer>
        </div>

        <script>
            lucide.createIcons();
            const BACKEND_URL = "https://api.darkdocker.qzz.io"; 
            let myID, myRoom, socket, localStream, screenStream;
            let peers = {};
            let isSharing = false;

            async function startApp(type) {
                myID = document.getElementById('user').value;
                const pass = document.getElementById('pass').value;
                myRoom = document.getElementById('room').value;
                if(!myID || !myRoom) return alert("Lengkapi data!");

                const res = await fetch(\`\${BACKEND_URL}/\${type}\`, {
                    method: 'POST',
                    body: JSON.stringify({username: myID, password: pass})
                });

                if(res.ok) { initRoom(); } else { alert("Gagal!"); }
            }

            async function initRoom() {
                document.getElementById('auth-section').classList.add('hidden');
                document.getElementById('call-section').classList.remove('hidden');
                document.getElementById('room-name').innerText = myRoom;

                localStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 }, audio: true
                });

                const grid = document.getElementById('video-grid');
                const selfCont = createVideoEl(myID, true);
                selfCont.querySelector('video').srcObject = localStream;
                grid.appendChild(selfCont);

                const wsURL = BACKEND_URL.replace('http','ws') + "/ws?id=" + myID + "&room=" + myRoom;
                socket = new WebSocket(wsURL);

                socket.onmessage = async (e) => {
                    const msg = JSON.parse(e.data);
                    if(!peers[msg.sender_id]) setupPeer(msg.sender_id, false);
                    
                    const pc = peers[msg.sender_id];
                    if(msg.type === 'offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                        const ans = await pc.createAnswer();
                        await pc.setLocalDescription(ans);
                        sendSig(msg.sender_id, 'answer', ans);
                    } else if(msg.type === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                    } else if(msg.type === 'candidate') {
                        await pc.addIceCandidate(new RTCIceCandidate(msg.data));
                    }
                };

                setTimeout(() => sendSig("all", "init", null), 1000);
            }

            function setupPeer(targetID, isInitiator) {
                const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
                peers[targetID] = pc;
                localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

                pc.onicecandidate = (e) => e.candidate && sendSig(targetID, 'candidate', e.candidate);
                pc.ontrack = (e) => {
                    if(document.getElementById('cont-'+targetID)) return;
                    const cont = createVideoEl(targetID, false);
                    cont.querySelector('video').srcObject = e.streams[0];
                    document.getElementById('video-grid').appendChild(cont);
                };

                if(isInitiator || true) {
                    pc.createOffer().then(o => { pc.setLocalDescription(o); sendSig(targetID, 'offer', o); });
                }
            }

            async function toggleScreenShare() {
                if(!isSharing) {
                    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    const track = screenStream.getVideoTracks()[0];
                    for(let id in peers) {
                        const sender = peers[id].getSenders().find(s => s.track.kind === 'video');
                        sender.replaceTrack(track);
                    }
                    document.querySelector('#cont-'+myID+' video').srcObject = screenStream;
                    isSharing = true;
                    track.onended = () => toggleScreenShare();
                } else {
                    const videoTrack = localStream.getVideoTracks()[0];
                    for(let id in peers) {
                        const sender = peers[id].getSenders().find(s => s.track.kind === 'video');
                        sender.replaceTrack(videoTrack);
                    }
                    document.querySelector('#cont-'+myID+' video').srcObject = localStream;
                    screenStream.getTracks().forEach(t => t.stop());
                    isSharing = false;
                }
            }

            function createVideoEl(id, isSelf) {
                const div = document.createElement('div');
                div.id = 'cont-' + id;
                div.className = 'relative';
                div.innerHTML = \`<video autoplay playsinline class="\${isSelf ? 'self-view' : ''}"></video>
                                 <div class="absolute bottom-4 left-4 glass px-3 py-1 rounded-full text-xs font-bold">\${id}</div>\`;
                return div;
            }

            function sendSig(target, type, data) {
                socket.send(JSON.stringify({ room_id: myRoom, sender_id: myID, target_id: target, type, data }));
            }

            function toggleTrack(type) {
                const track = type === 'video' ? localStream.getVideoTracks()[0] : localStream.getAudioTracks()[0];
                track.enabled = !track.enabled;
            }
        </script>
    </body>
    </html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}
