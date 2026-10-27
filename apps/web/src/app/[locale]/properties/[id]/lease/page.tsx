"use client";

import { Suspense, FormEvent, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { askLeaseQuestion, getListing } from "@/lib/api";
import { getProperty } from "@/lib/properties";
import type { LeaseQAResponse, Listing } from "@/lib/types";
import type { Property } from "@/lib/properties";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

interface ConversationTurn {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  confidence?: number;
  sourcePage?: number;
}

function LeaseChatContent() {
  const params = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | Listing | null>(null);
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingProperty, setFetchingProperty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!params.id) return;

    // Load property details
    const local = getProperty(params.id);
    if (local) {
      setProperty(local);
      setFetchingProperty(false);
      initGreeting(local.title);
    } else {
      getListing(params.id)
        .then((l) => {
          setProperty(l);
          initGreeting(l.title);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to load property");
        })
        .finally(() => setFetchingProperty(false));
    }
  }, [params.id]);

  function initGreeting(title: string) {
    const greeting: ConversationTurn = {
      id: "greet-1",
      sender: "assistant",
      text: `Hello! I am the AI Lease Assistant for ${title}. I have indexed the lease agreement, property rules, and utility specifications. Feel free to ask me anything about the security deposit, rent payment schedules, generator and water backup, or termination policies.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      confidence: 1.0,
      sourcePage: 1,
    };
    setConversation([greeting]);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, loading]);

  async function handleAskQuestion(queryText?: string) {
    const text = (queryText || question).trim();
    if (!text || loading) return;

    const userTurn: ConversationTurn = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversation((prev) => [...prev, userTurn]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const qaResult = await askLeaseQuestion(params.id, text);
      const assistantTurn: ConversationTurn = {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: qaResult.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        confidence: qaResult.confidence,
        sourcePage: qaResult.sourcePage,
      };
      setConversation((prev) => [...prev, assistantTurn]);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to analyze lease at this moment.";
      setError(errorMessage);
      const fallbackTurn: ConversationTurn = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: `I encountered an issue retrieving the lease record: ${errorMessage}. Please check your connection or try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        confidence: 0,
      };
      setConversation((prev) => [...prev, fallbackTurn]);
    } finally {
      setLoading(false);
    }
  }

  if (fetchingProperty) {
    return (
      <div style={{ padding: "8rem", textAlign: "center" }}>
        <Spinner label="Loading lease specifications..." />
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

  const suggestionChips = [
    "💰 How much is the security deposit?",
    "💧 Are water and electricity included in the rent?",
    "⚡ Does the building have an automatic standby generator?",
    "📅 What is the notice period for ending the lease?",
    "🐾 What is the policy regarding domestic pets?",
  ];

  return (
    <main className="page lease-chat-page">
      <div className="lease-chat-container">
        {/* Breadcrumb Header */}
        <div className="lease-chat-nav">
          <Link href={`/properties/${params.id}`} className="chat-breadcrumb__link">
            ← Back to {propTitle}
          </Link>
        </div>

        {/* Lease Context Banner */}
        <header className="lease-header-card">
          <div className="lease-header-card__icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lease-doc-icon">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="lease-header-card__content">
            <div className="lease-header-card__title-row">
              <h1>Lease Q&amp;A Assistant</h1>
              <span className="lease-status-pill">✓ Verified Agreement</span>
            </div>
            <p className="lease-header-card__desc">
              Conversational lease analysis for <strong>{propTitle}</strong> ({propPrice}).
              Ask any question without needing to log in.
            </p>
          </div>
        </header>

        {/* Conversation Stream */}
        <section className="lease-chat-thread" aria-label="Conversation history">
          {conversation.map((turn) => {
            const isUser = turn.sender === "user";
            return (
              <div
                key={turn.id}
                className={`lease-bubble-wrap ${
                  isUser ? "lease-bubble-wrap--user" : "lease-bubble-wrap--assistant"
                }`}
              >
                {!isUser && (
                  <div className="lease-assistant-avatar" aria-hidden="true">
                    AI
                  </div>
                )}
                <div className={`lease-bubble ${isUser ? "lease-bubble--user" : "lease-bubble--assistant"}`}>
                  <p className="lease-bubble__text">{turn.text}</p>
                  <div className="lease-bubble__footer">
                    <span className="lease-bubble__time">{turn.timestamp}</span>
                    {!isUser && turn.confidence !== undefined && turn.confidence > 0 && (
                      <span className="lease-confidence-tag">
                        ✓ {(turn.confidence * 100).toFixed(0)}% verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="lease-bubble-wrap lease-bubble-wrap--assistant">
              <div className="lease-assistant-avatar" aria-hidden="true">
                AI
              </div>
              <div className="lease-bubble lease-bubble--assistant lease-bubble--typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </section>

        {/* Quick Suggestion Prompts */}
        <div className="lease-quick-chips">
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="lease-chip-btn"
              onClick={() => handleAskQuestion(chip)}
              disabled={loading}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          className="lease-input-bar"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            handleAskQuestion();
          }}
        >
          <input
            type="text"
            className="lease-input-control"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about deposit, rent, utilities, pets, or lease terms..."
            disabled={loading}
            aria-label="Ask about the lease"
          />
          <button
            type="submit"
            className="lease-submit-btn"
            disabled={loading || !question.trim()}
          >
            {loading ? "Analyzing..." : "Ask AI"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LeasePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "8rem", textAlign: "center" }}>
          <Spinner label="Loading lease conversation..." />
        </div>
      }
    >
      <LeaseChatContent />
    </Suspense>
  );
}
