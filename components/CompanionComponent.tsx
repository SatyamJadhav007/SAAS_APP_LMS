"use client";

import { cn, configureAssistant, getSubjectColor } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import soundwaves from "@/constants/soundwaves.json";
enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}
const CompanionComponent = ({
  companionId,
  subject,
  topic,
  name,
  userName,
  userImage,
  style,
  voice,
}: CompanionComponentProps) => {
  //there are a total of 4 states in which the "callStatus" can be(chalu,band,khatam,connect)
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  // callStatus-> {color,visibility of lottie animation }
  // hello ???
  const [isSpeaking, setIsSpeaking] = useState(false);
  // **Muted... or not??
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  useEffect(() => {
    if (lottieRef) {
      // play the lottie animation if the user is speaking ...
      if (isSpeaking) lottieRef.current?.play();
      else {
        lottieRef.current?.stop();
      }
    }
  }, [isSpeaking]);
  useEffect(() => {
    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
    const onCallEnd = () => setCallStatus(CallStatus.FINISHED);
    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        console.log("newMessage", newMessage);
        setMessages((prev) => [newMessage, ...prev]);
      }
    };
    const onError = (error: Error) => console.error(error);
    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("error", onError);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("error", onError);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
    };
  }, []);
  //console.info("this is the user Image !!", userImage);
  const toogleMicrophone = () => {
    // by vapi.isMuted() we will come to know that the agent is yapping something or not
    const isMuted = vapi.isMuted();
    // just toggle the behaviour (chaluu ashel tr band else band ashel tr chalu)
    vapi.setMuted(!isMuted);
    // page varti pan same toggle kr....
    setIsMuted(!isMuted);
    // isMuted-> {micImage,micDescription}
  };
  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    // Passing subject,topic,style to the assitant ...
    const assistantOverrides = {
      variableValues: {
        subject,
        topic,
        style,
      },
      clientMessages: ["transcript"],
      serverMessages: [],
    };
    // Startin the conversation with the assitant
    vapi.start(configureAssistant(voice, style), assistantOverrides);
  };
  const handleDisconnect = () => {
    // setting the callStatus to finished and stopping the companion
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };
  return (
    <section className="flex flex-col h-[84vh]">
      <section className="flex gap-8 max-sm:flex-col">
        {/* this is the ai-companion section.... */}
        <div className="companion-section">
          <div
            className="companion-avatar"
            style={{ backgroundColor: getSubjectColor(subject) }}
          >
            {/* this is the avatar of the companion... */}
            <div
              className={cn(
                "absolute transition-opacity duration-1000",
                callStatus === CallStatus.FINISHED ||
                  callStatus === CallStatus.INACTIVE
                  ? "opacity-1001"
                  : "opacity-0",
                callStatus === CallStatus.CONNECTING &&
                  "opacity-100 animate-pulse"
              )}
            >
              <Image
                src={`/icons/${subject}.svg`}
                alt={subject}
                width={150}
                height={150}
                className="max-sm:w-fit"
              />
            </div>
            {/* this is the lottie animation part of the compnonent... */}
            <div
              className={cn(
                "absolute transition-opacity duration-1000",
                callStatus === CallStatus.ACTIVE ? "opacity-100" : "opacity-0"
              )}
            >
              <Lottie
                lottieRef={lottieRef}
                animationData={soundwaves}
                autoplay={false}
                className="companion-lottie"
              />
            </div>
          </div>
          {/* name of the companion is displayed here */}
          <p className="font-bold text-2xl">{name}</p>
        </div>
        {/* this is the right div which contains the user image */}
        <div className="user-section">
          <div className="user-avatar">
            <Image
              src={userImage}
              alt={userName}
              width={130}
              height={130}
              className="rounded-lg"
            />
            <p className="font-bold text-2xl">{userName}</p>
          </div>
          {/* mute button.... */}
          <button
            className="btn-mic"
            onClick={toogleMicrophone}
            disabled={callStatus !== CallStatus.ACTIVE}
          >
            {/* the Image will change on the basis of the value of the isMuted...  */}
            <Image
              src={isMuted ? "/icons/mic-off.svg" : "/icons/mic-on.svg"}
              alt="mic"
              width={36}
              height={36}
            />
            {/* same with the description of the mic */}
            <p className="max-sm:hidden">
              {isMuted ? "Turn no microphone" : "Turn off microphone"}
            </p>
          </button>
          {/* Start session button */}
          <button
            className={cn(
              "rounded-lg py-2 cursor-pointer transition-colors w-full  text-white ",
              callStatus === CallStatus.ACTIVE ? "bg-red-700" : "bg-primary",
              callStatus === CallStatus.CONNECTING && "animate-pulse"
            )}
            // for on click if the call is active then stop it else start the call...
            onClick={
              callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall
            }
          >
            {/* is the call started....  then show End session with the button color of "RED" */}
            {callStatus === CallStatus.ACTIVE
              ? "End Session"
              : callStatus === CallStatus.CONNECTING // if the call is connecting then show "connecting"
              ? "Connecting" // for inactive state show start sesssion message
              : "Start Session"}
          </button>
        </div>
      </section>
      <section className="transcript">
        <div className="transcript-message no-scrollbar block">
          {messages.map((message, index) => {
            if (message.role === "assistant") {
              return (
                <p key={index} className="max-sm:text-sm">
                  {name.split(" ")[0].replace("/[.,]/g, ", "")}:{" "}
                  {message.content}
                </p>
              );
            } else {
              return (
                <p key={index} className="text-primary max-sm:text-sm">
                  {userName}: {message.content}
                </p>
              );
            }
          })}
        </div>
        <div className="transcript-fade" />
      </section>
    </section>
  );
};

export default CompanionComponent;
