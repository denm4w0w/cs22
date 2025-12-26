import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import "./App.css";
import PlayerCard from "./components/PlayerCard";
import Radar from "./components/Radar";
import { getLatency, Latency } from "./components/latency";
import MaskedIcon from "./components/maskedicon";

const CONNECTION_TIMEOUT = 5000;

// --- CONFIGURARE TUNEL (2025) ---
const USE_LOCALHOST = 0; 
// ATENȚIE: Verifică dacă ID-ul de mai jos este cel actual din consola Ngrok!
const NGROK_URL = "632e21b7fc4b.ngrok-free.app"; 
const PORT = 22006; 
// --------------------------------------

const App = () => {
  const [averageLatency, setAverageLatency] = useState(0);
  const [playerArray, setPlayerArray] = useState([]);
  const [mapData, setMapData] = useState();
  const [localTeam, setLocalTeam] = useState();
  const [bombData, setBombData] = useState();
  const [settings, setSettings] = useState({
    dotSize: 1,
    bombSize: 0.5,
    showAllNames: false,
    showEnemyNames: true,
    showViewCones: false,
  });
  const [bannerOpened, setBannerOpened] = useState(true);

  useEffect(() => {
    let webSocket = null;
    let connectionTimeout = null;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const targetHost = USE_LOCALHOST ? `localhost:${PORT}` : NGROK_URL;
      const webSocketURL = `${protocol}://${targetHost}/cs2_webradar`;

      console.log("Connecting to:", webSocketURL);

      try {
        webSocket = new WebSocket(webSocketURL);
        webSocket.binaryType = "blob";
      } catch (error) {
        console.error("WS Error:", error);
        return;
      }

      connectionTimeout = setTimeout(() => {
        if (webSocket.readyState !== WebSocket.OPEN) {
          webSocket.close();
        }
      }, CONNECTION_TIMEOUT);

      webSocket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.info("Connected to radar server!");
      };

      webSocket.onmessage = async (event) => {
        setAverageLatency(getLatency());
        const rawData = typeof event.data === "string" ? event.data : await event.data.text();
        const parsedData = JSON.parse(rawData);
        
        setPlayerArray(parsedData.m_players || []);
        setLocalTeam(parsedData.m_local_team);
        setBombData(parsedData.m_bomb);

        const map = parsedData.m_map;
        if (map && map !== "invalid") {
          setMapData((prev) => {
             if (prev?.name === map) return prev;
             fetch(`data/${map}/data.json`)
               .then(res => res.json())
               .then(data => setMapData({ ...data, name: map }));
             return prev;
          });
          document.body.style.backgroundImage = `url(./data/${map}/background.png)`;
        }
      };

      webSocket.onclose = () => {
        console.warn("Disconnected. Retrying in 3s...");
        setTimeout(connect, 3000);
      };

      webSocket.onerror = (err) => {
        const msg = document.querySelector(".radar_message");
        if (msg) msg.textContent = "Connection failed. Make sure Ngrok is running on PC.";
      };
    };

    connect();
    return () => webSocket?.close();
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col" style={{
        background: `radial-gradient(50% 50% at 50% 50%, rgba(20, 40, 55, 0.95) 0%, rgba(7, 20, 30, 0.95) 100%)`,
        backdropFilter: `blur(7.5px)`,
      }}>
      {bannerOpened && (
        <section className="w-full flex items-center justify-between p-2 bg-radar-primary">
          <span className="w-full text-center text-[#1E3A54]">
            <span className="font-medium">€3.49</span> - HURRACAN - Plug & play feature rich radar
            <a className="ml-2 inline banner-link text-[#1E3A54]" href="https://hurracan.com">Learn more</a>
          </span>
          <button onClick={() => setBannerOpened(false)} className="hover:bg-[#9BC5E4]">
            <svg width="16" height="16" xmlns="www.w3.org" viewBox="0 0 32 32"><path fill="#4E799F" d="M 7.21875 5.78125 L 5.78125 7.21875 L 14.5625 16 L 5.78125 24.78125 L 7.21875 26.21875 L 16 17.4375 L 24.78125 26.21875 L 26.21875 24.78125 L 17.4375 16 L 26.21875 7.21875 L 24.78125 5.78125 L 16 14.5625 Z" /></svg>
          </button>
        </section>
      )}
      <div className={`w-full h-full flex flex-col justify-center overflow-hidden relative`}>
          <div className={`flex items-center justify-evenly`}>
            <Latency value={averageLatency} settings={settings} setSettings={setSettings} />
            <ul id="terrorist" className="lg:flex hidden flex-col gap-7 m-0 p-0">
              {playerArray.filter((p) => p.m_team == 2).map((p) => (<PlayerCard right={false} key={p.m_idx} playerData={p} />))}
            </ul>
            {(playerArray.length > 0 && mapData) ? (
              <Radar playerArray={playerArray} radarImage={`./data/${mapData.name}/radar.png`} mapData={mapData} localTeam={localTeam} averageLatency={averageLatency} bombData={bombData} settings={settings} />
            ) : (
              <div id="radar" className="relative overflow-hidden origin-center"><h1 className="radar_message text-white">Waiting for Ngrok connection...</h1></div>
            )}
            <ul id="counterTerrorist" className="lg:flex hidden flex-col gap-7 m-0 p-0">
              {playerArray.filter((p) => p.m_team == 3).map((p) => (<PlayerCard right={true} key={p.m_idx} playerData={p} settings={settings} />))}
            </ul>
          </div>
      </div>
    </div>
  );
};

export default App;
