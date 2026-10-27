"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { getProperty } from "@/lib/properties";
import { getListing } from "@/lib/api";
import type { Property } from "@/lib/properties";
import type { Listing } from "@/lib/types";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

interface ChatMessage {
  id: string;
  sender: "renter" | "landlord";
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

function CheckmarkIcon({ status }: { status: "sent" | "delivered" | "read" }) {
  if (status === "sent") {
    return (
      <span className="msg-status msg-status--sent" title="Sent">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="status-svg">
          <polyline points="3 8 7 12 13 4" />
        </svg>
        <span>Sent</span>
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className="msg-status msg-status--delivered" title="Delivered">
        <svg viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="2" className="status-svg">
          <polyline points="2 8 6 12 12 4" />
          <polyline points="7 8 11 12 17 4" />
        </svg>
        <span>Delivered</span>
      </span>
    );
  }

  return (
    <span className="msg-status msg-status--read" title="Read by Landlord">
      <svg viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="2.2" className="status-svg">
        <polyline points="2 8 6 12 12 4" />
        <polyline points="7 8 11 12 17 4" />
      </svg>
      <span>Read</span>
    </span>
  );
}

function MessagesContent() {
  const params = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const storageKey = `rv_chat_${params.id}`;

  const defaultMessages: ChatMessage[] = [
    {
      id: "m-welcome-1",
      sender: "landlord",
      text: "Selam! Thank you for your interest in this listing. I'm Dawit, the verified owner. Feel free to ask about scheduling a viewing, moving dates, or lease conditions.",
      timestamp: "10:15 AM",
      status: "read",
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);

  // Load property and persisted messages
  useEffect(() => {
    if (!params.id) return;

    // Load property details
    const localProp = getProperty(params.id);
    if (localProp) {
      setProperty(localProp);
      setLoading(false);
    } else {
      getListing(params.id)
        .then((l) => setProperty(l))
        .catch(() => setProperty(null))
        .finally(() => setLoading(false));
    }

    // Load persisted chat history
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (err) {
        console.warn("Could not parse saved chat history:", err);
      }
    }
  }, [params.id, storageKey]);

  // Persist messages whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, storageKey]);

  const quickPrompts = [
    "📅 Can I schedule an in-person viewing this Saturday?",
    "💰 Is the 2-month security deposit flexible?",
    "💧 How reliable is the backup water tank and generator?",
    "📝 Ready to move forward with lease application",
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const newId = `msg-${Date.now()}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg: ChatMessage = {
      id: newId,
      sender: "renter",
      text,
      timestamp: timeStr,
      status: "sent",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // Simulate real-time read receipts progression:
    // 1. Sent -> Delivered after 1.2s
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newId ? { ...m, status: "delivered" } : m))
      );
    }, 1200);

    // 2. Delivered -> Read after 2.5s
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newId ? { ...m, status: "read" } : m))
      );
      setIsTyping(true);
    }, 2600);

    // 3. Landlord replies after 4.5s
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "Thank you for the message! Yes, we can certainly arrange that. What time works best for you?";

      const lower = text.toLowerCase();
      if (lower.includes("viewing") || lower.includes("saturday") || lower.includes("tour")) {
        replyText = "Saturday afternoon between 2:00 PM and 5:00 PM is great for an on-site visit. I will have the apartment unlocked and ready for you.";
      } else if (lower.includes("deposit") || lower.includes("price") || lower.includes("rent")) {
        replyText = "The standard deposit is 2 months held in secure escrow, but we can structure payment in two installments if you have a 1-year commitment.";
      } else if (lower.includes("water") || lower.includes("generator") || lower.includes("power")) {
        replyText = "The building has a 5,000L backup water tank and a 75kVA automatic diesel generator that powers all lighting, outlets, and the elevator during municipal outages.";
      } else if (lower.includes("apply") || lower.includes("lease")) {
        replyText = "Wonderful! You can review the verified digital lease clauses right here on RentVision or share your ID copy to initiate the agreement.";
      }

      const landlordReply: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: "landlord",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "read",
      };

      setMessages((prev) => [...prev, landlordReply]);
    }, 4500);
  };

  if (loading) {
    return (
      <div style={{ padding: "8rem", textAlign: "center" }}>
        <Spinner label="Loading conversation..." />
      </div>
    );
  }

  if (!property) {
    return (
      <main className="page">
        <ErrorState message="Property not found" />
      </main>
    );
  }

  const propTitle = property.title;
  const propPrice = property.price ? `${property.price.toLocaleString()} ETB / month` : "";
  const propLocation =
    "location" in property
      ? property.location
      : property.address?.subcity
      ? `${property.address.subcity}, ${property.address.city}`
      : "Addis Ababa";
  const propImage =
    "imageUrl" in property
      ? property.imageUrl
      : property.mediaKeys?.[0] || "/images/landing/modern-home.jpg";

  return (
    <main className="chat-page">
      <div className="chat-container">
        {/* Navigation Breadcrumb */}
        <div className="chat-breadcrumb">
          <Link href={`/properties/${params.id}`} className="chat-breadcrumb__link">
            ← Back to {propTitle}
          </Link>
        </div>

        {/* Property Snapshot Card */}
        <section className="chat-property-card" aria-label="Property summary">
          <div className="chat-property-card__thumb">
            <Image
              src={propImage}
              alt={propTitle}
              width={80}
              height={60}
              className="chat-property-card__img"
              unoptimized
            />
          </div>
          <div className="chat-property-card__details">
            <h2 className="chat-property-card__title">{propTitle}</h2>
            <p className="chat-property-card__meta">
              <span className="chat-property-card__price">{propPrice}</span>
              <span className="chat-property-card__dot">·</span>
              <span className="chat-property-card__loc">{propLocation}</span>
            </p>
          </div>
          <div className="chat-property-card__badge">
            <span className="verified-chip">✓ Verified Listing</span>
          </div>
        </section>

        {/* Landlord Profile Header */}
        <header className="chat-landlord-header">
          <div className="chat-landlord-avatar-wrap">
            <div className="chat-landlord-avatar">DK</div>
            <span className="online-indicator" title="Landlord is online" />
          </div>
          <div className="chat-landlord-info">
            <div className="chat-landlord-name-row">
              <strong className="chat-landlord-name">Dawit Kebede</strong>
              <span className="landlord-role-badge">Property Owner</span>
            </div>
            <p className="chat-landlord-status">
              <span className="online-text">Active now</span>
              <span className="bullet">·</span>
              <span>Typically replies within 15 minutes</span>
            </p>
          </div>
        </header>

        {/* Chat Thread */}
        <section className="chat-messages-panel" aria-label="Messages">
          <div className="chat-messages-date-divider">
            <span>Today</span>
          </div>

          <div className="chat-messages-list">
            {messages.map((msg) => {
              const isRenter = msg.sender === "renter";
              return (
                <div
                  key={msg.id}
                  className={`chat-bubble-wrap ${
                    isRenter ? "chat-bubble-wrap--renter" : "chat-bubble-wrap--landlord"
                  }`}
                >
                  {!isRenter && (
                    <div className="landlord-chat-avatar" aria-hidden="true">
                      DK
                    </div>
                  )}

                  <div className={`chat-bubble ${isRenter ? "chat-bubble--renter" : "chat-bubble--landlord"}`}>
                    <p className="chat-bubble__text">{msg.text}</p>
                    <div className="chat-bubble__footer">
                      <span className="chat-bubble__time">{msg.timestamp}</span>
                      {isRenter && <CheckmarkIcon status={msg.status} />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="chat-bubble-wrap chat-bubble-wrap--landlord">
                <div className="landlord-chat-avatar" aria-hidden="true">
                  DK
                </div>
                <div className="chat-bubble chat-bubble--landlord chat-bubble--typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        </section>

        {/* Quick Suggestion Chips */}
        <div className="chat-quick-prompts" aria-label="Suggested inquiries">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="chat-prompt-chip"
              onClick={() => handleSendMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            className="chat-input-control"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Write a message to Dawit about this property..."
            aria-label="Message input"
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputText.trim()}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="send-svg">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>Send</span>
          </button>
        </form>
      </div>
    </main>
  );
}

export default function PropertyMessagesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "8rem", textAlign: "center" }}>
          <Spinner label="Loading conversation..." />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
