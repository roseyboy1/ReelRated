
import { supabase } from './supabase.js';

async function loadMovies() {

    // Get published movies only
    const { data: movies, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .eq('status', 'published');

    if (movieError) {
        console.error('Error loading movies:', movieError);
        return;
    }

    // Get editorial grades
    const { data: reviews, error: reviewError } = await supabase
        .from('editorial_reviews')
        .select('movie_id, grade');

    if (reviewError) {
        console.error('Error loading editorial grades:', reviewError);
        return;
    }

    // Get community grades
    const { data: communityReviews, error: communityError } = await supabase
        .from('community_reviews')
        .select('movie_id, grade');

    if (communityError) {
        console.error('Error loading community grades:', communityError);
        return;
    }

    // Convert letter grades into numbers
    const gradeValues = {
        'A+': 12,
        'A': 11,
        'A-': 10,
        'B+': 9,
        'B': 8,
        'B-': 7,
        'C+': 6,
        'C': 5,
        'C-': 4,
        'D+': 3,
        'D': 2,
        'D-': 1,
        'F': 0
    };

    // Convert average back into a letter grade
    function getAverageGrade(average) {

        const grades = [
            'F', 'D-', 'D', 'D+',
            'C-', 'C', 'C+',
            'B-', 'B', 'B+',
            'A-', 'A', 'A+'
        ];

        return grades[Math.max(0, Math.min(12, Math.round(average)))];
    }

    // Find homepage movie grid
    const movieGrid = document.getElementById('movieGrid');

    if (!movieGrid) {
        console.error('Movie grid not found!');
        return;
    }

    // Populate genre dropdown
    const genreFilter = document.getElementById('genreFilter');

    if (genreFilter) {

        genreFilter.innerHTML = '<option value="">All Genres</option>';

        const genres = new Map();

        movies.forEach(function(movie) {

            (movie.genre || '').split(',').forEach(function(genre) {

                const cleanGenre = genre.trim();

                if (cleanGenre) {
                    genres.set(cleanGenre.toLowerCase(), cleanGenre);
                }

            });

        });

        [...genres.entries()]
            .sort(function(a, b) {
                return a[1].localeCompare(b[1]);
            })
            .forEach(function(entry) {

                const option = document.createElement('option');

                option.value = entry[0];
                option.textContent = entry[1];

                genreFilter.appendChild(option);

            });

    }

    // Clear existing cards
    movieGrid.innerHTML = '';

    // Create each movie card
    movies.forEach(function(movie) {

        // Find editorial grade
        const review = reviews.find(function(item) {
            return item.movie_id === movie.id;
        });

        const editorialGrade = review ? review.grade : 'N/A';

        const gradeClasses = {
            'A+': 'grade-a',
            'A': 'grade-a',
            'A-': 'grade-a-minus',
            'B+': 'grade-b',
            'B': 'grade-b'
        };

        // Find community reviews for this movie
        const movieCommunityReviews = communityReviews.filter(function(item) {
            return item.movie_id === movie.id;
        });

        let communityGrade = 'No ratings yet';

        if (movieCommunityReviews.length > 0) {

            const total = movieCommunityReviews.reduce(function(sum, item) {
                return sum + (gradeValues[item.grade] ?? 0);
            }, 0);

            const average = total / movieCommunityReviews.length;

            communityGrade = getAverageGrade(average);
        }

        // Create movie card
        const card = document.createElement('article');
        card.className = 'movie-card';

        // Store genres for filtering
        card.dataset.genres = (movie.genre || '')
            .split(',')
            .map(function(genre) {
                return genre.trim().toLowerCase();
            })
            .filter(Boolean)
            .join('|');

        card.onclick = function() {
            window.location.href =
                'movie.html?id=' + encodeURIComponent(movie.slug);
        };

        // Create poster
        const poster = document.createElement('div');
        poster.className = 'movie-poster';

        const image = document.createElement('img');
        image.src = movie.poster_url;
        image.alt = movie.title + ' poster';

        // Editorial grade badge
        const gradeBadge = document.createElement('span');
        gradeBadge.className =
            'grade ' + (gradeClasses[editorialGrade] || '');

        gradeBadge.textContent = editorialGrade;

        poster.appendChild(image);
        poster.appendChild(gradeBadge);

        // Movie title
        const title = document.createElement('h3');
        title.textContent = movie.title;

        // Year and genre
        const details = document.createElement('p');
        details.textContent =
            movie.year + ' · ' + (movie.genre || '').replace(/,\s*/g, ' / ');

        // Community grade container
        const community = document.createElement('div');
        community.className = 'community-card-grade';

        const communityLabel = document.createElement('span');
        communityLabel.textContent = 'COMMUNITY';

        const communityValue = document.createElement('strong');

        if (movieCommunityReviews.length > 0) {

            communityValue.textContent =
                communityGrade + ' (' +
                movieCommunityReviews.length + ' reviews)';

        } else {

            communityValue.textContent = 'No ratings yet';

        }

        community.appendChild(communityLabel);
        community.appendChild(communityValue);

        // Assemble movie card
        card.appendChild(poster);
        card.appendChild(title);
        card.appendChild(details);
        card.appendChild(community);

        movieGrid.appendChild(card);

    });

    console.log(
        'ReelRated homepage populated with published movies only!'
    );

}

loadMovies();
