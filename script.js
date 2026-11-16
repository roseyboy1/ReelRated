
// REELRATED MOVIE SEARCH AND GENRE FILTER

const searchInput = document.getElementById("movieSearch");
const genreFilter = document.getElementById("genreFilter");

function filterMovies() {

    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedGenre = genreFilter.value;

    const movieCards = document.querySelectorAll(".movie-card");

    movieCards.forEach(function(card) {

        const movieTitle = card.querySelector("h3").textContent.toLowerCase();

        const movieGenres = (card.dataset.genres || '').split('|');

        const matchesSearch = movieTitle.includes(searchTerm);

        const matchesGenre =
            selectedGenre === '' || movieGenres.includes(selectedGenre);

        if (matchesSearch && matchesGenre) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }

    });

}

// Listen for search input
searchInput.addEventListener("input", filterMovies);

// Listen for genre selection
genreFilter.addEventListener("change", filterMovies);
