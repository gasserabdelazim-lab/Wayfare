"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import NavIcon from "../components/NavIcon";
import AccountPanel from "../components/AccountPanel";
import { destinationInfo, findDestinationPhotos } from "../lib/destinations";
import { useWayfareAccount } from "../lib/useWayfareAccount";

const NAV_ITEMS = [
  { id: "plans", icon: "plans", label: "Plans" },
  { id: "settle", icon: "settle", label: "Settle up" },
  { id: "updates", icon: "updates", label: "Updates" },
  { id: "profile", icon: "profile", label: "Profile" },
];

const EXPENSE_GROUP_PREFIX = "WAYFARE_GROUP::";
const CURRENCY_OPTIONS = ["EUR", "USD", "GBP", "AED", "CHF", "CAD", "AUD", "JPY", "EGP", "TRY", "SAR"];
const AVATAR_OPTIONS = ["🧭", "😎", "🌴", "⛰️", "🌊", "🏕️", "🛫", "📸"];

function isExpenseGroup(trip) {
  return String(trip?.name || "").startsWith(EXPENSE_GROUP_PREFIX);
}

function displayTripName(trip) {
  return String(trip?.name || "").replace(EXPENSE_GROUP_PREFIX, "");
}

function AvatarPreview({ name, avatar, className = "profile-bubble" }) {
  if (avatar?.startsWith("data:image") || avatar?.startsWith("https://")) return <div className={`${className} has-photo`}><img src={avatar} alt="" /></div>;
  return <div className={className}>{avatar || (name || "Y").slice(0, 1).toUpperCase()}</div>;
}

function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const size = 220;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function DestinationCover({ name }) {
  const [photos, setPhotos] = useState(destinationInfo(name).photos.slice(0, 3));

  useEffect(() => {
    const controller = new AbortController();
    setPhotos(destinationInfo(name).photos.slice(0, 3));
    findDestinationPhotos(name, { size: 1000, limit: 3, signal: controller.signal })
      .then((found) => found.length && setPhotos(found))
      .catch(() => {});
    return () => controller.abort();
  }, [name]);

  return <div className="trip-card-cover destination-cover-collage">{photos.slice(0, 3).map((photo, index) => <img key={photo} className={`cover-photo cover-photo-${index + 1}`} src={photo} alt="" />)}</div>;
}

function dateFromInput(value) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function endDateForDuration(startDate, duration) {
  const date = dateFromInput(startDate);
  if (!date) return "";
  date.setDate(date.getDate() + Math.max(1, Number(duration) || 1) - 1);
  return date.toISOString().slice(0, 10);
}

function inclusiveDays(startDate, endDate) {
  const start = dateFromInput(startDate);
  const end = dateFromInput(endDate);
  if (!start || !end || end < start) return null;
  return Math.round((end - start) / 86400000) + 1;
}

function tripDateLabel(trip) {
  if (!trip?.start_date) return `${trip?.duration_days || 3} DAYS`;
  const start = dateFromInput(trip.start_date);
  const end = dateFromInput(trip.end_date || trip.start_date);
  const startText = start.toLocaleDateString([], { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${startText} – ${endText} · ${trip?.duration_days || inclusiveDays(trip.start_date, trip.end_date) || 1} DAYS`;
}

export default function Home() {
  const router = useRouter();
  const account = useWayfareAccount();
  const [tripName, setTripName] = useState("");
  const [tripDays, setTripDays] = useState(3);
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [yourName, setYourName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("plans");
  const [trips, setTrips] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupCurrency, setGroupCurrency] = useState("EUR");
  const [groupCreating, setGroupCreating] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [settleError, setSettleError] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileHome, setProfileHome] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileCurrency, setProfileCurrency] = useState("EUR");
  const [deletePlanTarget, setDeletePlanTarget] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (NAV_ITEMS.some((item) => item.id === requestedView)) setActiveView(requestedView);
    const savedProfile = localStorage.getItem("wayfare_profile_name") || "";
    const savedAvatar = localStorage.getItem("wayfare_profile_avatar") || "";
    const savedHome = localStorage.getItem("wayfare_profile_home") || "";
    const savedBio = localStorage.getItem("wayfare_profile_bio") || "";
    const savedCurrency = localStorage.getItem("wayfare_profile_currency") || "EUR";
    setYourName(savedProfile);
    setProfileAvatar(savedAvatar);
    setProfileHome(savedHome);
    setProfileBio(savedBio);
    setProfileCurrency(CURRENCY_OPTIONS.includes(savedCurrency) ? savedCurrency : "EUR");
    setGroupCurrency(CURRENCY_OPTIONS.includes(savedCurrency) ? savedCurrency : "EUR");
    const tripIds = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (key.startsWith("wayfare_name_")) tripIds.push(key.replace("wayfare_name_", ""));
    }
    if (!tripIds.length) return;
    supabase.from("trips").select("id,name,start_date,end_date,created_at,currency,duration_days").in("id", tripIds)
      .then(({ data }) => setTrips((data || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))));
    supabase.from("activities").select("id,trip_id,name,created_at").in("trip_id", tripIds).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setRecentActivities(data || []));
  }, []);

  useEffect(() => {
    if (!account.profile) return;
    const cloud = account.profile;
    const nextName = cloud.display_name || "";
    const nextAvatar = cloud.avatar || "";
    const nextHome = cloud.home_city || "";
    const nextBio = cloud.bio || "";
    const nextCurrency = CURRENCY_OPTIONS.includes(cloud.preferred_currency) ? cloud.preferred_currency : "EUR";
    setYourName(nextName);
    setProfileAvatar(nextAvatar);
    setProfileHome(nextHome);
    setProfileBio(nextBio);
    setProfileCurrency(nextCurrency);
    setGroupCurrency(nextCurrency);
    localStorage.setItem("wayfare_profile_name", nextName);
    localStorage.setItem("wayfare_profile_avatar", nextAvatar);
    localStorage.setItem("wayfare_profile_home", nextHome);
    localStorage.setItem("wayfare_profile_bio", nextBio);
    localStorage.setItem("wayfare_profile_currency", nextCurrency);
  }, [account.profile]);

  useEffect(() => {
    if (!account.user) return;
    supabase.from("travelers").select("trip_id").eq("user_id", account.user.id).then(async ({ data }) => {
      const accountTripIds = [...new Set((data || []).map((item) => item.trip_id).filter(Boolean))];
      if (!accountTripIds.length) return;
      const { data: accountTrips } = await supabase.from("trips").select("id,name,start_date,end_date,created_at,currency,duration_days").in("id", accountTripIds);
      setTrips((current) => {
        const merged = new Map(current.map((trip) => [trip.id, trip]));
        (accountTrips || []).forEach((trip) => merged.set(trip.id, trip));
        return [...merged.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      });
      const { data: accountActivities } = await supabase.from("activities").select("id,trip_id,name,created_at").in("trip_id", accountTripIds).order("created_at", { ascending: false }).limit(20);
      setRecentActivities((current) => {
        const merged = new Map(current.map((activity) => [activity.id, activity]));
        (accountActivities || []).forEach((activity) => merged.set(activity.id, activity));
        return [...merged.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 20);
      });
    });
  }, [account.user]);

  const tripById = useMemo(() => Object.fromEntries(trips.map((trip) => [trip.id, trip])), [trips]);
  const planTrips = useMemo(() => trips.filter((trip) => !isExpenseGroup(trip)), [trips]);
  const expenseGroups = useMemo(() => trips.filter(isExpenseGroup), [trips]);

  function changeTripDuration(value) {
    const nextDays = Math.max(1, Math.min(30, Number(value) || 1));
    setTripDays(nextDays);
    if (tripStartDate) setTripEndDate(endDateForDuration(tripStartDate, nextDays));
  }

  function changeTripStartDate(value) {
    setTripStartDate(value);
    setTripEndDate(value ? endDateForDuration(value, tripDays) : "");
  }

  function changeTripEndDate(value) {
    setTripEndDate(value);
    const days = inclusiveDays(tripStartDate, value);
    if (days) setTripDays(Math.min(30, days));
  }

  async function saveProfile() {
    localStorage.setItem("wayfare_profile_name", yourName.trim());
    localStorage.setItem("wayfare_profile_avatar", profileAvatar);
    localStorage.setItem("wayfare_profile_home", profileHome.trim());
    localStorage.setItem("wayfare_profile_bio", profileBio.trim());
    localStorage.setItem("wayfare_profile_currency", profileCurrency);
    setGroupCurrency(profileCurrency);
    const cloudResult = await account.saveProfile({ name: yourName, avatar: profileAvatar, home: profileHome, bio: profileBio, currency: profileCurrency });
    if (cloudResult.error) setActionNotice(`Saved on this device, but cloud sync failed: ${cloudResult.error.message}`);
    else setActionNotice(account.user ? "Your profile was saved and synced." : "Your guest profile was saved on this device.");
    setTimeout(() => setActionNotice(""), 3200);
  }

  function navigateView(view) {
    setActiveView(view);
    router.replace(view === "plans" ? "/" : `/?view=${view}`, { scroll: false });
  }

  async function createTrip() {
    if (!tripName.trim() || !yourName.trim()) {
      setError("Add a trip title and your name first.");
      return;
    }
    setLoading(true);
    setError("");
    const { data: trip, error: tripErr } = await supabase.from("trips").insert({
      name: tripName.trim(),
      duration_days: Math.max(1, Math.min(30, Number(tripDays) || 1)),
      start_date: tripStartDate || null,
      end_date: tripEndDate || null,
      currency: profileCurrency,
      created_by: account.user?.id || null,
    }).select().single();
    if (tripErr) {
      setError(`Couldn't create the trip: ${tripErr.message || "try again."}`);
      setLoading(false);
      return;
    }
    const { error: travelerErr } = await supabase.from("travelers").insert({ trip_id: trip.id, name: yourName.trim(), avatar: profileAvatar || null, user_id: account.user?.id || null, role: "owner" });
    if (travelerErr) {
      setError("Trip created, but couldn't add you as a traveler.");
      setLoading(false);
      return;
    }
    localStorage.setItem(`wayfare_name_${trip.id}`, yourName.trim());
    localStorage.setItem("wayfare_profile_name", yourName.trim());
    router.push(`/trip/${trip.id}`);
  }

  async function deletePlan() {
    if (!deletePlanTarget || deletingPlan) return;
    setDeletingPlan(true);
    const target = deletePlanTarget;
    const { error: deleteError } = await supabase.from("trips").delete().eq("id", target.id);
    setDeletingPlan(false);
    if (deleteError) {
      setActionNotice(`Couldn't delete ${target.name}: ${deleteError.message}`);
      return;
    }
    localStorage.removeItem(`wayfare_name_${target.id}`);
    localStorage.removeItem(`wayfare_currency_${target.id}`);
    localStorage.removeItem(`wayfare_expense_group_${target.id}`);
    setTrips((current) => current.filter((trip) => trip.id !== target.id));
    setRecentActivities((current) => current.filter((activity) => activity.trip_id !== target.id));
    setDeletePlanTarget(null);
    setActionNotice(`${target.name} was deleted.`);
    setTimeout(() => setActionNotice(""), 4200);
  }

  async function chooseProfilePhoto(file) {
    if (!file) return;
    try {
      const photo = await compressProfilePhoto(file);
      setProfileAvatar(photo);
      localStorage.setItem("wayfare_profile_avatar", photo);
    } catch {
      setActionNotice("That photo couldn't be used. Try a JPG or PNG.");
    }
  }

  async function createExpenseGroup() {
    if (!groupName.trim() || !yourName.trim()) {
      setSettleError("Add a group name and your name first.");
      return;
    }
    setGroupCreating(true);
    setSettleError("");
    const { data: group, error: groupErr } = await supabase.from("trips").insert({
      name: `${EXPENSE_GROUP_PREFIX}${groupName.trim()}`,
      currency: groupCurrency,
      created_by: account.user?.id || null,
    }).select().single();
    if (groupErr) {
      setSettleError(`Couldn't create this expense group: ${groupErr.message || "try again."}`);
      setGroupCreating(false);
      return;
    }
    const { error: travelerErr } = await supabase.from("travelers").insert({ trip_id: group.id, name: yourName.trim(), avatar: profileAvatar || null, user_id: account.user?.id || null, role: "owner" });
    if (travelerErr) {
      setSettleError("Group created, but couldn't add you as a member.");
      setGroupCreating(false);
      return;
    }
    localStorage.setItem(`wayfare_name_${group.id}`, yourName.trim());
    localStorage.setItem("wayfare_profile_name", yourName.trim());
    localStorage.setItem(`wayfare_expense_group_${group.id}`, "true");
    router.push(`/trip/${group.id}?view=settle`);
  }

  return (
    <main className="mobile-app-home">
      <header className="app-header">
        <div><div className="brand-mark dark">WAYFARE</div><p>Plan together. Settle simply.</p></div>
        <button type="button" className="header-profile-button" aria-label="Open your profile" onClick={() => navigateView("profile")}><AvatarPreview name={yourName} avatar={profileAvatar} /></button>
      </header>

      <div className="app-content">
        {activeView === "plans" && (
          <section className="plans-home-view">
            <div className="app-welcome"><div className="eyebrow">Your trips</div><h1>Plans</h1><p>Create a trip, add suggestions, and let everyone vote.</p></div>
            {planTrips.length > 0 && <div className="saved-trips">
              <div className="section-title-row"><h2>In progress</h2><span>{planTrips.length}</span></div>
              {planTrips.map((trip) => (
                <div className="saved-trip-row" key={trip.id}>
                  <button className="saved-trip-card" onClick={() => router.push(`/trip/${trip.id}`)}>
                    <DestinationCover name={trip.name} />
                    <div><small>GROUP PLAN · {tripDateLabel(trip)}</small><strong>{trip.name}</strong><span>Open proposals →</span></div>
                  </button>
                  <button className="plan-delete-button" aria-label={`Delete ${trip.name} plan`} title="Delete plan" onClick={() => setDeletePlanTarget(trip)}>×</button>
                </div>
              ))}
            </div>}
            <section className="quick-create-card">
              <div className="eyebrow">New plan</div>
              <h2>Create a trip</h2>
              <label className="field-label">Trip title</label>
              <input placeholder="e.g. Barcelona with friends" value={tripName} onChange={(e) => setTripName(e.target.value)} />
              <div className="trip-date-card">
                <div className="trip-date-heading"><div><strong>Trip dates</strong><small>Optional — you can decide later</small></div><span>Calendar</span></div>
                <div className="trip-date-grid">
                  <label><span>Starts</span><input aria-label="Trip start date" type="date" value={tripStartDate} onChange={(event) => changeTripStartDate(event.target.value)} /></label>
                  <label><span>Ends</span><input aria-label="Trip end date" type="date" min={tripStartDate || undefined} value={tripEndDate} onChange={(event) => changeTripEndDate(event.target.value)} disabled={!tripStartDate} /></label>
                </div>
              </div>
              <label className="field-label">How many days?</label>
              <div className="duration-input"><button type="button" onClick={() => changeTripDuration(Number(tripDays) - 1)}>−</button><input aria-label="Trip duration in days" type="number" min="1" max="30" value={tripDays} onChange={(event) => changeTripDuration(event.target.value)} /><span>days</span><button type="button" onClick={() => changeTripDuration(Number(tripDays) + 1)}>＋</button></div>
              <label className="field-label">Your name</label>
              <input placeholder="So friends know it's you" value={yourName} onChange={(e) => setYourName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTrip()} />
              {error && <p className="form-error">{error}</p>}
              <button onClick={createTrip} disabled={loading}>{loading ? "Creating…" : "Create plan →"}</button>
            </section>
          </section>
        )}

        {activeView === "settle" && <section className="simple-app-view settle-home-view">
          <div className="eyebrow">Shared expenses</div><h1>Settle up</h1><p className="view-intro">Use a trip, or create an everyday group without planning anything first.</p>
          <div className="settle-choice-card">
            <button className="settle-new-group" onClick={() => setGroupFormOpen((open) => !open)}>
              <span className="settle-choice-icon">＋</span><span><strong>New expense group</strong><small>Groceries, rent, dinners, roommates, or anything shared</small></span><b>{groupFormOpen ? "×" : "›"}</b>
            </button>
            {groupFormOpen && <div className="expense-group-form">
              <div className="expense-group-examples"><span>Groceries</span><span>Apartment</span><span>Weekend dinner</span></div>
              <label className="field-label">Group name</label>
              <input placeholder="e.g. Apartment expenses" value={groupName} onChange={(event) => { setGroupName(event.target.value); setSettleError(""); }} />
              <div className="expense-form-grid">
                <div><label className="field-label">Your name</label><input placeholder="So everyone knows it's you" value={yourName} onChange={(event) => setYourName(event.target.value)} /></div>
                <div><label className="field-label">Currency</label><select value={groupCurrency} onChange={(event) => setGroupCurrency(event.target.value)}>{CURRENCY_OPTIONS.map((code) => <option key={code} value={code}>{code}</option>)}</select></div>
              </div>
              {settleError && <p className="form-error">{settleError}</p>}
              <button className="create-expense-group" onClick={createExpenseGroup} disabled={groupCreating}>{groupCreating ? "Creating…" : "Create group and add expenses →"}</button>
            </div>}
          </div>

          {(expenseGroups.length > 0 || planTrips.length > 0) ? <div className="settle-lists">
            {expenseGroups.length > 0 && <><div className="section-title-row settle-section-title"><h2>Expense groups</h2><span>{expenseGroups.length}</span></div>{expenseGroups.map((group) => <button className="feed-row settle-destination-row" key={group.id} onClick={() => router.push(`/trip/${group.id}?view=settle`)}><span className="feed-icon">⌂</span><div><small className="row-kicker">EVERYDAY GROUP</small><strong>{displayTripName(group)}</strong><small>Add expenses and see who owes whom</small></div><b>›</b></button>)}</>}
            {planTrips.length > 0 && <><div className="section-title-row settle-section-title"><h2>Trips</h2><span>{planTrips.length}</span></div>{planTrips.map((trip) => <button className="feed-row settle-destination-row" key={trip.id} onClick={() => router.push(`/trip/${trip.id}?view=settle`)}><span className="feed-icon">✈</span><div><small className="row-kicker">TRIP EXPENSES</small><strong>{trip.name}</strong><small>Use during the trip or settle afterward</small></div><b>›</b></button>)}</>}
          </div> : <EmptyView title="Nothing to settle yet" text="Create an expense group above, or make a trip from Plans." />}
        </section>}

        {activeView === "updates" && <section className="simple-app-view">
          <div className="eyebrow">Latest activity</div><h1>Updates</h1><p className="view-intro">New suggestions and changes across your plans.</p>
          {recentActivities.length ? recentActivities.map((activity) => <button className="feed-row" key={activity.id} onClick={() => router.push(`/trip/${activity.trip_id}?view=updates`)}><span className="feed-icon">✦</span><div><strong>{activity.name}</strong><small>Added to {tripById[activity.trip_id]?.name || "a group plan"}</small></div><b>›</b></button>) : <EmptyView title="No updates yet" text="New proposals and votes will appear here." />}
        </section>}

        {activeView === "profile" && <section className="simple-app-view profile-view">
          <div className="eyebrow">Your space</div><h1>Profile</h1><p className="view-intro">Make Wayfare feel like yours. This profile is used when you create or join plans and groups.</p>
          <div className="profile-hero-card">
            <AvatarPreview name={yourName} avatar={profileAvatar} className="large-profile-bubble" />
            <div><h2>{yourName.trim() || "Your name"}</h2><p>{profileHome.trim() || "Add your home city"}</p></div>
            <span className="profile-device-badge">{account.user ? "Synced account" : "Guest on this device"}</span>
          </div>
          <div className="profile-stats" aria-label="Your Wayfare activity">
            <div><strong>{planTrips.length}</strong><span>Trips</span></div>
            <div><strong>{expenseGroups.length}</strong><span>Groups</span></div>
            <div><strong>{recentActivities.length}</strong><span>Updates</span></div>
          </div>
          <AccountPanel account={account} displayName={yourName} />
          <div className="profile-card profile-editor-card">
            <div className="profile-section-heading"><div><h3>Photo or avatar</h3><p>Choose what friends see beside your votes and expenses.</p></div></div>
            <div className="avatar-picker">{AVATAR_OPTIONS.map((avatar) => <button type="button" key={avatar} aria-label={`Use ${avatar} avatar`} className={profileAvatar === avatar ? "selected" : ""} onClick={() => setProfileAvatar(avatar)}>{avatar}</button>)}</div>
            <label className="photo-upload-button">Upload your photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseProfilePhoto(event.target.files?.[0])} /></label>
            <div className="profile-fields">
              <label><span className="field-label">Display name</span><input placeholder="Your name" value={yourName} onChange={(event) => setYourName(event.target.value)} /></label>
              <label><span className="field-label">Home city</span><input placeholder="e.g. Dubai" value={profileHome} onChange={(event) => setProfileHome(event.target.value)} /></label>
              <label className="profile-field-wide"><span className="field-label">About you</span><textarea rows="3" maxLength="140" placeholder="Travel style, favourite food, or anything your friends should know" value={profileBio} onChange={(event) => setProfileBio(event.target.value)} /></label>
              <label className="profile-field-wide"><span className="field-label">Preferred currency</span><select value={profileCurrency} onChange={(event) => setProfileCurrency(event.target.value)}>{CURRENCY_OPTIONS.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
            </div>
            <button type="button" className="save-profile-button" onClick={saveProfile}>Save profile</button>
            <p className="profile-privacy-note">{account.user ? "Saved privately to your Wayfare account and available on your other devices." : "Guest profiles stay on this device. Create an account above whenever you want cloud sync."}</p>
          </div>
        </section>}
      </div>

      {deletePlanTarget && <div className="confirm-backdrop" role="presentation" onClick={() => !deletingPlan && setDeletePlanTarget(null)}><div className="confirm-sheet plan-delete-sheet" role="dialog" aria-modal="true" aria-labelledby="delete-plan-title" onClick={(event) => event.stopPropagation()}><div className="confirm-icon">×</div><h3 id="delete-plan-title">Delete “{deletePlanTarget.name}”?</h3><p>This permanently removes the plan, its activities, votes, comments, and expenses for everyone with the link.</p><div className="confirm-actions"><button onClick={() => setDeletePlanTarget(null)} disabled={deletingPlan}>Cancel</button><button className="danger-button" onClick={deletePlan} disabled={deletingPlan}>{deletingPlan ? "Deleting…" : "Delete plan"}</button></div></div></div>}
      {actionNotice && <div className="action-notice" role="status">{actionNotice}</div>}

      <nav className="mobile-bottom-nav home-bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => <button key={item.id} className={`bottom-nav-item ${activeView === item.id ? "active" : ""}`} onClick={() => navigateView(item.id)}><NavIcon name={item.icon} /><small>{item.label}</small></button>)}
      </nav>
    </main>
  );
}

function EmptyView({ title, text }) {
  return <div className="app-empty"><span>✦</span><h3>{title}</h3><p>{text}</p></div>;
}
