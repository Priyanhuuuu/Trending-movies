/* ================= CONFIG ================= */
const API_KEY = "6c1a9280b377500121d707e88e05e15d";
const IMG_URL = "https://image.tmdb.org/t/p/original";

/* ================= DOM ================= */
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("searchBtn");
const suggestions = document.getElementById("suggestions");
const clearBtn = document.getElementById("clearBtn");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const navbar = document.querySelector(".navbar");

const slidesContainer = document.getElementById("slides");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");

/* ================= API CACHE ================= */
const CACHE = new Map();

async function fetchJSON(url) {
  if (CACHE.has(url)) return CACHE.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error("API Error");
  const data = await res.json();
  CACHE.set(url, data);
  return data;
}

/* ================= UTILITIES ================= */
function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ================= SEARCH ================= */
searchInput.addEventListener(
  "input",
  debounce(async () => {
    const query = searchInput.value.trim();
    clearBtn.style.display = query ? "block" : "none";
    suggestions.innerHTML = "";

    if (query.length < 2) {
      suggestions.style.display = "none";
      return;
    }

    const data = await fetchJSON(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
    );

    data.results.slice(0, 7).forEach(movie => {
      const li = document.createElement("li");
      li.textContent = movie.title;
      li.onclick = () => {
        searchInput.value = movie.title;
        suggestions.style.display = "none";
      };
      suggestions.appendChild(li);
    });

    suggestions.style.display = "block";
  })
);

clearBtn.onclick = () => {
  searchInput.value = "";
  suggestions.style.display = "none";
  clearBtn.style.display = "none";
};

searchInput.onfocus = () => navbar.classList.add("search-active");

document.addEventListener("click", e => {
  if (!e.target.closest(".search-container")) {
    suggestions.style.display = "none";
    navbar.classList.remove("search-active");
  }
});

/* ================= NAV ================= */
hamburger.onclick = () => navLinks.classList.toggle("show");

/* ================= MOVIE RENDER ================= */
function renderMovies(movies, containerId, isTV = false, append = false) {
  const container = document.getElementById(containerId);
  if (!container || !movies?.length) return;
  if (!append) container.innerHTML = "";

  const fragment = document.createDocumentFragment();

  movies.forEach(movie => {
    if (!movie.poster_path) return;
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <img loading="lazy" src="${IMG_URL + movie.poster_path}">
      <div class="movie-info">
        <h4>${isTV ? movie.name : movie.title}</h4>
        <p>${(movie.release_date || movie.first_air_date || "").slice(0, 4)}</p>
      </div>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

/* ================= HOME DATA ================= */
(async () => {
  const popular = await fetchJSON(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`);
  renderMovies(popular.results.slice(0, 10), "popularMovies");

  const trending = await fetchJSON(`https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`);
  renderMovies(trending.results.slice(0, 10), "trendingMovies");

  const series = await fetchJSON(`https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}`);
  renderMovies(series.results.slice(0, 10), "topSeries", true);
})();

/* ================= SLIDER ================= */
let currentIndex = 1;
let sliderMovies = [];
let autoSlide;

async function initSlider() {
  const data = await fetchJSON(
    `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}`
  );
  sliderMovies = data.results.slice(0, 6);
  renderSlides();
  startAutoSlide();
}

function createSlide(movie) {
  const slide = document.createElement("div");
  slide.className = "slide";
  slide.style.backgroundImage = `url(${IMG_URL + movie.backdrop_path})`;
  slide.innerHTML = `
    <div class="slide-content">
      <h1>${movie.title}</h1>
      <p>${movie.release_date?.slice(0, 4)}</p>
      <button class="watch-btn">Watch Now</button>
    </div>
  `;
  slidesContainer.appendChild(slide);
}

function renderSlides() {
  slidesContainer.innerHTML = "";
  createSlide(sliderMovies[sliderMovies.length - 1]);
  sliderMovies.forEach(createSlide);
  createSlide(sliderMovies[0]);

  currentIndex = 1;
  slidesContainer.style.transition = "none";
  slidesContainer.style.transform = "translateX(-100%)";
}

function updateSlide(animate = true) {
  slidesContainer.style.transition = animate ? "transform .6s ease" : "none";
  slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
}

nextBtn.onclick = () => {
  currentIndex++;
  updateSlide();
  if (currentIndex === sliderMovies.length + 1) {
    setTimeout(() => {
      currentIndex = 1;
      updateSlide(false);
    }, 600);
  }
};

prevBtn.onclick = () => {
  currentIndex--;
  updateSlide();
  if (currentIndex === 0) {
    setTimeout(() => {
      currentIndex = sliderMovies.length;
      updateSlide(false);
    }, 600);
  }
};

function startAutoSlide() {
  clearInterval(autoSlide);
  autoSlide = setInterval(() => nextBtn.onclick(), 5000);
}

initSlider();

/* ================= SEE MORE ================= */
async function seeMore(btn, pageRef, api, containerId, isTV = false) {
  btn.disabled = true;
  btn.textContent = "Loading...";
  pageRef.value++;

  const data = await fetchJSON(`${api}&page=${pageRef.value}`);
  renderMovies(data.results.slice(0, 10), containerId, isTV, true);

  btn.textContent = "See More";
  btn.disabled = false;
}

const popularPage = { value: 1 };
const trendingPage = { value: 1 };
const seriesPage = { value: 1 };

seeMorePopular.onclick = e => {
  e.preventDefault();
  seeMore(e.target, popularPage,
    `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`,
    "popularMovies"
  );
};

seeMoreTrending.onclick = e => {
  e.preventDefault();
  seeMore(e.target, trendingPage,
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`,
    "trendingMovies"
  );
};

seeMoreSeries.onclick = e => {
  e.preventDefault();
  seeMore(e.target, seriesPage,
    `https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}`,
    "topSeries",
    true
  );
};
