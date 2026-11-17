interface StoredSong {
	id: string;
	link: string;
	cover: string;
	title: string;
	artist: string;
	who: string;
	msg: string;
}

interface SpotifyController {
	addListener: (
		event: "playback_update",
		listener: (event: { data: { isPaused: boolean } }) => void,
	) => void;
	loadUri: (uri: string) => void;
}

interface SpotifyIFrameApi {
	createController: (
		element: HTMLElement,
		options: { uri: string; width: string; height: number },
		callback: (controller: SpotifyController) => void,
	) => void;
}

const STORAGE_KEY = "portfolio-song-wall";
const root = document.querySelector<HTMLElement>(".song-wall");
const form = root?.querySelector<HTMLFormElement>("#song-form");
const songStatus = root?.querySelector<HTMLElement>("#song-form-status");
const collection = root?.querySelector<HTMLElement>("[data-song-collection]");
const empty = root?.querySelector<HTMLElement>("[data-song-empty]");
const trackList = root?.querySelector<HTMLOListElement>("[data-track-list]");
const currentTitle = root?.querySelector<HTMLElement>("[data-current-title]");
const currentArtist = root?.querySelector<HTMLElement>("[data-current-artist]");
const currentWho = root?.querySelector<HTMLElement>("[data-current-who]");
const currentMessage = root?.querySelector<HTMLElement>(
	"[data-current-message]",
);
const currentEmbed = root?.querySelector<HTMLElement>("[data-current-embed]");
let activeController: SpotifyController | undefined;

const setEmbedLoading = (isLoading: boolean) => {
	if (!currentEmbed) return;
	currentEmbed.classList.toggle("song-wall__embed--loading", isLoading);
	currentEmbed.setAttribute("aria-busy", String(isLoading));
};

const spotifyApiReady = new Promise<SpotifyIFrameApi | null>((resolve) => {
	(
		window as typeof window & {
			onSpotifyIframeApiReady?: (api: SpotifyIFrameApi) => void;
		}
	).onSpotifyIframeApiReady = resolve;
	const apiScript = document.createElement("script");
	apiScript.src = "https://open.spotify.com/embed/iframe-api/v1";
	apiScript.async = true;
	apiScript.addEventListener("error", () => resolve(null), { once: true });
	document.head.append(apiScript);
});

const readSongs = (): StoredSong[] => {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		return Array.isArray(saved) ? saved : [];
	} catch {
		return [];
	}
};

const saveSongs = (items: StoredSong[]) =>
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
const initialSongs = (() => {
	try {
		return JSON.parse(root?.dataset.initialSongs ?? "[]") as StoredSong[];
	} catch {
		return [];
	}
})();

const allSongs = [...readSongs()].reverse();
initialSongs.forEach((song) => {
	if (!allSongs.some((saved) => saved.link === song.link)) {
		allSongs.push({ ...song, id: song.id ?? crypto.randomUUID() });
	}
});
let selectedId = allSongs[0]?.id;

const getTrackId = (spotifyUrl: string) => {
	try {
		return new URL(spotifyUrl).pathname.split("/")[2] ?? "";
	} catch {
		return "";
	}
};

const renderCurrentSong = async (song: StoredSong) => {
	if (
		!currentTitle ||
		!currentArtist ||
		!currentWho ||
		!currentMessage ||
		!currentEmbed
	)
		return;
	currentTitle.textContent = song.title;
	currentArtist.textContent = song.artist;
	currentWho.textContent = song.who;
	currentMessage.textContent = `“${song.msg}”`;
	const trackId = getTrackId(song.link);
	root?.classList.remove("song-wall--playing");
	setEmbedLoading(Boolean(trackId));
	if (!trackId) return;

	const uri = `spotify:track:${trackId}`;
	if (activeController) {
		activeController.loadUri(uri);
		return;
	}

	const api = await spotifyApiReady;
	if (selectedId !== song.id) return;

	if (api) {
		currentEmbed.replaceChildren();
		api.createController(
			currentEmbed,
			{ uri, width: "100%", height: 152 },
			(controller) => {
				if (selectedId !== song.id) {
					const selectedSong = allSongs.find((item) => item.id === selectedId);
					if (selectedSong)
						controller.loadUri(
							`spotify:track:${getTrackId(selectedSong.link)}`,
						);
				}
				activeController = controller;
				controller.addListener("playback_update", (event) => {
					setEmbedLoading(false);
					root?.classList.toggle("song-wall--playing", !event.data.isPaused);
				});
			},
		);
	} else {
		currentEmbed.replaceChildren();
		const iframe = document.createElement("iframe");
		iframe.src = `https://open.spotify.com/embed/track/${encodeURIComponent(trackId)}?utm_source=generator`;
		iframe.title = `Listen to ${song.title} on Spotify`;
		iframe.loading = "lazy";
		iframe.allow =
			"autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
		iframe.addEventListener("load", () => setEmbedLoading(false), {
			once: true,
		});
		currentEmbed.append(iframe);
	}
};

const renderWall = () => {
	const hasSongs = allSongs.length > 0;
	if (collection) collection.hidden = !hasSongs;
	if (empty) empty.hidden = hasSongs;
	if (!hasSongs || !trackList) return;

	const selectedSong =
		allSongs.find((song) => song.id === selectedId) ?? allSongs[0];
	selectedId = selectedSong.id;
	renderCurrentSong(selectedSong);
	trackList.replaceChildren();

	allSongs.forEach((song, index) => {
		const item = document.createElement("li");
		const button = document.createElement("button");
		button.type = "button";
		button.className = "song-wall__track";
		button.classList.toggle("song-wall__track--active", song.id === selectedId);
		button.setAttribute("aria-pressed", String(song.id === selectedId));

		const parts = [
			["song-wall__track-number", String(index + 1).padStart(2, "0")],
			["song-wall__track-title", song.title],
			["song-wall__track-dots", ""],
			["song-wall__track-artist", song.artist],
			["song-wall__track-who", song.who],
		];
		parts.forEach(([className, text]) => {
			const part = document.createElement("span");
			part.className = className;
			part.textContent = text;
			button.append(part);
		});
		button.addEventListener("click", () => {
			selectedId = song.id;
			renderWall();
		});
		item.append(button);
		trackList.append(item);
	});
};

renderWall();

form?.addEventListener("submit", async (event) => {
	event.preventDefault();
	if (!form || !songStatus) return;
	const data = new FormData(form);
	const link = String(data.get("spotifyLink") ?? "").trim();
	const who = String(data.get("submittedBy") ?? "").trim() || "Anonymous";
	const msg =
		String(data.get("message") ?? "").trim() ||
		"No explanation. Just trust me.";

	let spotifyUrl: URL;
	try {
		spotifyUrl = new URL(link);
		if (
			spotifyUrl.hostname !== "open.spotify.com" ||
			!spotifyUrl.pathname.startsWith("/track/")
		)
			throw new Error();
	} catch {
		songStatus.textContent = "Use a Spotify track link. Copy one from the song's Share menu.";
		return;
	}
	if (allSongs.some((song) => song.link === spotifyUrl.href)) {
		songStatus.textContent = "That song is already on your wall. Pick another track.";
		return;
	}

	const submit = form.querySelector<HTMLButtonElement>(".song-submit");
	if (submit) submit.disabled = true;
	songStatus.textContent = "Getting your track…";
	let title = "Spotify track";
	let artist = "Spotify";
	let cover = "";
	try {
		const response = await fetch(
			`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl.href)}`,
		);
		if (response.ok) {
			const metadata = await response.json();
			title = metadata.title || title;
			artist = metadata.author_name || artist;
			cover = metadata.thumbnail_url || cover;
		}
	} catch {
		/* Keep fallbacks when Spotify metadata is unavailable. */
	}

	const song: StoredSong = {
		id: crypto.randomUUID(),
		link: spotifyUrl.href,
		cover,
		title,
		artist,
		who,
		msg,
	};
	try {
		saveSongs([...readSongs(), song]);
		allSongs.unshift(song);
		selectedId = song.id;
		renderWall();
		form.reset();
		songStatus.textContent = "Pinned in this browser. Happy listening <3";
	} catch {
		songStatus.textContent = "Couldn't save this song. Check that your browser allows site storage, then try again.";
	} finally {
		if (submit) submit.disabled = false;
	}
});
