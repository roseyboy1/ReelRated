
import { supabase } from './supabase.js';

// Grade conversion
const gradeValues = {
    'A+': 12, 'A': 11, 'A-': 10,
    'B+': 9, 'B': 8, 'B-': 7,
    'C+': 6, 'C': 5, 'C-': 4,
    'D+': 3, 'D': 2, 'D-': 1, 'F': 0
};

// Convert average into a letter grade
function getAverageGrade(average) {
    const grades = [
        'F', 'D-', 'D', 'D+',
        'C-', 'C', 'C+',
        'B-', 'B', 'B+',
        'A-', 'A', 'A+'
    ];

    return grades[
        Math.max(0, Math.min(12, Math.round(average)))
    ];
}


// LOAD PUBLIC MEMBER PROFILE
async function loadProfile() {

    const profileUsername = document.getElementById('profileUsername');
    const profileJoined = document.getElementById('profileJoined');
    const profileBio = document.getElementById('profileBio');
    const moviesReviewed = document.getElementById('profileMoviesReviewed');
    const averageGrade = document.getElementById('profileAverageGrade');
    const reviewsList = document.getElementById('profileReviewsList');
    const favoriteMoviesList = document.getElementById('profileFavoriteMovies');

    // Get username from URL
    const params = new URLSearchParams(window.location.search);
    const username = params.get('username');

    if (!username) {
        profileUsername.textContent = 'Profile not found';
        reviewsList.textContent = 'No username was provided.';
        favoriteMoviesList.textContent = '';
        return;
    }

    // Find profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, created_at, bio')
        .ilike('username', username)
        .maybeSingle();

    if (profileError || !profile) {

        console.error('Error loading profile:', profileError);

        profileUsername.textContent = 'Profile not found';
        reviewsList.textContent =
            'This member profile could not be found.';
        favoriteMoviesList.textContent = '';

        return;
    }

    // Display username
    profileUsername.textContent = '@' + profile.username;
    document.title = '@' + profile.username + ' | ReelRated';

    // Display bio
    if (profile.bio && profile.bio.trim()) {
        profileBio.textContent = profile.bio;
    } else {
        profileBio.textContent = '';
    }

    // Display membership date
    if (profile.created_at) {

        const joinedDate = new Date(profile.created_at);

        profileJoined.textContent =
            'Member since ' + joinedDate.toLocaleDateString(
                'en-AU',
                {
                    month: 'long',
                    year: 'numeric'
                }
            );

    }


    // LOAD FAVOURITE MOVIES
    const { data: favorites, error: favoritesError } = await supabase
        .from('user_favorite_movies')
        .select(`
            id,
            movies (
                title,
                year,
                slug,
                poster_url
            )
        `)
        .eq('user_id', profile.id);

    if (favoritesError) {

        console.error('Error loading favourite movies:', favoritesError);

        favoriteMoviesList.textContent =
            'Unable to load favourite movies.';

    } else {

        favoriteMoviesList.innerHTML = '';

        if (!favorites || favorites.length === 0) {

            favoriteMoviesList.textContent =
                'This member has not selected any favourite movies yet.';

        } else {

            const favoriteGrid = document.createElement('div');
            favoriteGrid.className = 'favorite-movie-grid';

            favorites.forEach(function(favorite) {

                const movie = favorite.movies;

                if (!movie) return;

                const card = document.createElement('article');
                card.className = 'favorite-movie-card';

                const movieLink = document.createElement('a');
                movieLink.href =
                    'movie.html?id=' + encodeURIComponent(movie.slug);

                const poster = document.createElement('img');
                poster.src = movie.poster_url;
                poster.alt = movie.title + ' poster';

                const title = document.createElement('h3');
                title.textContent = movie.title;

                const year = document.createElement('p');
                year.textContent = movie.year;

                movieLink.appendChild(poster);

                card.appendChild(movieLink);
                card.appendChild(title);
                card.appendChild(year);

                favoriteGrid.appendChild(card);

            });

            favoriteMoviesList.appendChild(favoriteGrid);

        }

    }


    // LOAD MEMBER REVIEWS
    const { data: reviews, error: reviewsError } = await supabase
        .from('community_reviews')
        .select(`
            grade,
            review_text,
            movies (
                title,
                year,
                slug,
                poster_url
            )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

    if (reviewsError) {

        console.error('Error loading member reviews:', reviewsError);

        reviewsList.textContent =
            'Unable to load this member’s reviews.';

        return;
    }

    // Display review count
    moviesReviewed.textContent = reviews.length;

    // Calculate average grade
    if (reviews.length > 0) {

        const total = reviews.reduce(function(sum, review) {
            return sum + (gradeValues[review.grade] ?? 0);
        }, 0);

        averageGrade.textContent =
            getAverageGrade(total / reviews.length);

    } else {

        averageGrade.textContent = '—';

    }

    // Clear loading message
    reviewsList.innerHTML = '';

    // Empty review history
    if (reviews.length === 0) {

        reviewsList.textContent =
            'This member has not reviewed any movies yet.';

        return;
    }

    // Display each review
    reviews.forEach(function(review) {

        const movie = review.movies;

        if (!movie) return;

        const card = document.createElement('article');
        card.className = 'account-review-card';

        const poster = document.createElement('img');
        poster.src = movie.poster_url;
        poster.alt = movie.title + ' poster';

        const details = document.createElement('div');
        details.className = 'account-review-details';

        const title = document.createElement('h3');
        title.textContent = movie.title;

        const year = document.createElement('p');
        year.textContent = movie.year;

        const writtenReview = document.createElement('p');
        writtenReview.className = 'account-written-review';
        writtenReview.textContent =
            review.review_text || 'No written review added.';

        const movieLink = document.createElement('a');
        movieLink.href =
            'movie.html?id=' + encodeURIComponent(movie.slug);
        movieLink.textContent = 'View Movie';

        const grade = document.createElement('strong');
        grade.className = 'account-review-grade';
        grade.textContent = review.grade;

        details.appendChild(title);
        details.appendChild(year);
        details.appendChild(writtenReview);
        details.appendChild(movieLink);

        card.appendChild(poster);
        card.appendChild(details);
        card.appendChild(grade);

        reviewsList.appendChild(card);

    });

    console.log('Member profile loaded:', profile.username);
}


// START PAGE
loadProfile();
