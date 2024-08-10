import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const VideoCall = () => {
  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [error, setError] = useState(null);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();

  useEffect(() => {
    socket.current = io.connect("http://localhost:3000");

    socket.current.on("connect", () => {
      console.log("Connected to server");
    });

    socket.current.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError("Failed to connect to server");
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
        setError("Failed to access camera/microphone");
      });

    socket.current.on("yourID", (id) => {
      console.log("Received ID:", id);
      setYourID(id);
    });

    socket.current.on("allUsers", (users) => {
      console.log("All users:", users);
      setUsers(users);
    });

    socket.current.on("hey", (data) => {
      console.log("Receiving call from:", data.from);
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  function callPeer(id) {
    console.log("Calling peer:", id);
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });

    peer.on("signal", (data) => {
      console.log("Sending signal to:", id);
      socket.current.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: yourID
      });
    });

    peer.on("stream", (stream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    socket.current.on("callAccepted", (signal) => {
      console.log("Call accepted");
      setCallAccepted(true);
      peer.signal(signal);
    });
  }

  function acceptCall() {
    console.log("Accepting call from:", caller);
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });
    peer.on("signal", (data) => {
      socket.current.emit("acceptCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      partnerVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
  }

  let UserVideo;
  if (stream) {
    UserVideo = <video playsInline muted ref={userVideo} autoPlay />;
  }

  let PartnerVideo;
  if (callAccepted) {
    PartnerVideo = <video playsInline ref={partnerVideo} autoPlay />;
  }

  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        <h1>{caller} is calling you</h1>
        <button onClick={acceptCall}>Accept</button>
      </div>
    );
  }

  return (
    <div>
      {error && <div>Error: {error}</div>}
      <div>Your ID: {yourID}</div>
      <div>
        {UserVideo}
        {PartnerVideo}
      </div>
      <div>
        {Object.keys(users).map((key) => {
          if (key === yourID) {
            return null;
          }
          return (
            <button key={key} onClick={() => callPeer(key)}>
              Call {key}
            </button>
          );
        })}
      </div>
      <div>{incomingCall}</div>
    </div>
  );
};

export default VideoCall;
