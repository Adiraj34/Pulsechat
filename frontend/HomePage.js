"use client";

import { useEffect, useRef, useState } from "react";

const CHAT_USERS = [
  { id: "ava", name: "Ava Patel", accent: "var(--accent-warm)" },
  { id: "liam", name: "Liam Carter", accent: "var(--accent-cool)" },
];

const POLL_INTERVAL = 2000;
const BOTTOM_THRESHOLD = 48;

function isNearBottom(element) {
  if (!element) {
    return true;
  }

  const distanceFromBottom =
    element.scrollHeight - element.scrollTop - element.clientHeight;
  return distanceFromBottom <= BOTTOM_THRESHOLD;
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp));
}

export default function HomePage() {
  const [activeUserId, setActiveUserId] = useState(CHAT_USERS[0].id);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const messagesAreaRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const scrollBehaviorRef = useRef("auto");

  const activeUser =
    CHAT_USERS.find((user) => user.id === activeUserId) ?? CHAT_USERS[0];

  async function loadMessages({ preserveLoading = true } = {}) {
    if (preserveLoading) {
      setIsLoading(true);
    }

    try {
      const response = await fetch(`/api/messages?userId=${activeUser.id}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load messages.");
      }

      setMessages(data.messages);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (preserveLoading) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    shouldAutoScrollRef.current = true;
    scrollBehaviorRef.current = "auto";
    loadMessages();
  }, [activeUser.id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadMessages({ preserveLoading: false });
    }, POLL_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [activeUser.id]);

  useEffect(() => {
    function handleWindowClick() {
      setOpenMenuId(null);
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    window.addEventListener("click", handleWindowClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("click", handleWindowClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const area = messagesAreaRef.current;

    if (!area || !shouldAutoScrollRef.current) {
      return;
    }

    area.scrollTo({
      top: area.scrollHeight,
      behavior: scrollBehaviorRef.current,
    });
    scrollBehaviorRef.current = "auto";
  }, [messages]);

  function handleMessagesScroll(event) {
    shouldAutoScrollRef.current = isNearBottom(event.currentTarget);
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      setError("Type a message before sending.");
      return;
    }

    if (trimmedDraft.length > 500) {
      setError("Messages must stay within 500 characters.");
      return;
    }

    try {
      setIsSending(true);
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: activeUser.id,
          senderName: activeUser.name,
          content: trimmedDraft,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to send message.");
      }

      setDraft("");
      setError("");
      shouldAutoScrollRef.current = true;
      scrollBehaviorRef.current = "smooth";
      await loadMessages({ preserveLoading: false });
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(messageId, scope) {
    try {
      const search = new URLSearchParams({ scope });
      if (scope === "me") {
        search.set("userId", activeUser.id);
      }

      const response = await fetch(
        `/api/messages/${messageId}?${search.toString()}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete message.");
      }

      setOpenMenuId(null);
      await loadMessages({ preserveLoading: false });
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleTogglePin(messageId, pinned) {
    try {
      const response = await fetch(`/api/messages/${messageId}/pin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pinned }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update pinned state.");
      }

      setOpenMenuId(null);
      await loadMessages({ preserveLoading: false });
    } catch (pinError) {
      setError(pinError.message);
    }
  }

  const pinnedMessages = messages.filter((message) => message.isPinned);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Realtime-ready team messaging</p>
          <h1>PulseChat</h1>
          <p className="hero-copy">
            A polished chat experience with persistent history, delete-for-me,
            delete-for-everyone, pinned updates, and lightweight live refresh.
          </p>
        </div>

        <div className="presence-panel">
          <span className="presence-label">Active profile</span>
          <div className="user-switcher">
            {CHAT_USERS.map((user) => (
              <button
                key={user.id}
                type="button"
                className={
                  user.id === activeUser.id ? "user-chip active" : "user-chip"
                }
                onClick={() => setActiveUserId(user.id)}
                style={{ "--user-accent": user.accent }}
              >
                {user.name}
              </button>
            ))}
          </div>
          <p className="presence-note">
            Switch profiles to simulate another user and verify per-user delete
            behavior.
          </p>
        </div>
      </section>

      <section className="board">
        <aside className="pinned-panel">
          <div className="panel-title-row">
            <div>
              <p className="panel-kicker">Pinned board</p>
              <h2>Important messages</h2>
            </div>
            <span className="count-pill">{pinnedMessages.length}</span>
          </div>

          {pinnedMessages.length > 0 ? (
            <div className="pinned-list">
              {pinnedMessages.map((message) => (
                <article key={`pinned-${message.id}`} className="pinned-card">
                  <div className="pinned-meta">
                    <strong>{message.senderName}</strong>
                    <span>{formatTimestamp(message.createdAt)}</span>
                  </div>
                  <p>{message.content}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Pin a message to keep decisions and reminders visible here.</p>
            </div>
          )}
        </aside>

        <section className="chat-panel">
          <div className="chat-header">
            <div>
              <p className="panel-kicker">Conversation</p>
              <h2>Team room</h2>
            </div>
            <div className="live-indicator">
              <span className="live-dot" />
              Polling every {POLL_INTERVAL / 1000}s
            </div>
          </div>

          <div
            className="messages-area"
            ref={messagesAreaRef}
            onScroll={handleMessagesScroll}
          >
            {isLoading ? (
              <div className="status-card">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="status-card">
                No messages yet. Start the conversation below.
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.senderId === activeUser.id;
                return (
                  <article
                    key={message.id}
                    className={
                      isOwn ? "message-card own-message" : "message-card"
                    }
                  >
                    <div className="message-topline">
                      <div className="message-author">
                        <strong>{message.senderName}</strong>
                        {message.isPinned ? (
                          <span className="tag">Pinned</span>
                        ) : null}
                        {message.isDeletedForEveryone ? (
                          <span className="tag muted">Deleted</span>
                        ) : null}
                      </div>
                      <time>{formatTimestamp(message.createdAt)}</time>
                    </div>

                    <p
                      className={
                        message.isDeletedForEveryone
                          ? "message-copy deleted-copy"
                          : "message-copy"
                      }
                    >
                      {message.content}
                    </p>

                    <div className="message-actions">
                      <div
                        className="message-menu"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="menu-trigger"
                          aria-label="Open message actions"
                          aria-expanded={openMenuId === message.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId((current) =>
                              current === message.id ? null : message.id,
                            );
                          }}
                        >
                          ...
                        </button>

                        {openMenuId === message.id ? (
                          <div className="menu-dropdown" role="menu">
                            <button
                              type="button"
                              className="menu-item"
                              onClick={() => handleDelete(message.id, "me")}
                            >
                              Delete for me
                            </button>
                            <button
                              type="button"
                              className="menu-item danger"
                              onClick={() =>
                                handleDelete(message.id, "everyone")
                              }
                              disabled={message.isDeletedForEveryone}
                            >
                              Delete for everyone
                            </button>
                            <button
                              type="button"
                              className="menu-item"
                              onClick={() =>
                                handleTogglePin(message.id, !message.isPinned)
                              }
                              disabled={message.isDeletedForEveryone}
                            >
                              {message.isPinned ? "Unpin" : "Pin"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <form className="composer" onSubmit={handleSendMessage}>
            <label className="composer-label" htmlFor="messageInput">
              Message as {activeUser.name}
            </label>
            <div className="composer-row">
              <textarea
                id="messageInput"
                className="composer-input"
                placeholder="Share an update, ask a question, or pin an important note..."
                value={draft}
                maxLength={500}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
              />
              <button
                type="submit"
                className="send-button"
                disabled={isSending}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
            <div className="composer-footer">
              <span>{draft.trim().length}/500</span>
              {error ? (
                <span className="error-text">{error}</span>
              ) : (
                <span>Changes are saved automatically.</span>
              )}
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
