
import { supabase } from './supabase.js';

// Grade conversion
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


// Convert average into a letter grade
function getAverageGrade(average) {
    const grades = [
        'F', 'D-', 'D', 'D+',
        'C-', 'C', 'C+',
        'B-', 'B', 'B+',
        'A-', 'A', 'A+'
    ];

    const rounded = Math.round(average);

    return grades[Math.max(0, Math.min(12, rounded))];
}


// WATCHLIST FUNCTIONALITY
async function loadWatchlist(movieId, user) {

    const watchlistButton = document.getElementById('watchlistButton');
    const watchlistMessage = document.getElementById('watchlistMessage');

    let isOnWatchlist = false;

    if (!user) {

        watchlistButton.textContent = '+ Add to Watchlist';

        watchlistButton.addEventListener('click', function() {
            window.location.href = 'auth.html';
        });

        watchlistMessage.textContent =
            'Log in to save movies to your Watchlist.';

        return;
    }

    // Check whether movie is already saved
    const { data: savedMovie, error } = await supabase
        .from('user_watchlist')
        .select('id')
        .eq('movie_id', movieId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {

        console.error('Error checking Watchlist:', error);

        watchlistMessage.textContent =
            'Unable to load your Watchlist.';

        watchlistButton.disabled = true;

        return;
    }

    isOnWatchlist = !!savedMovie;

    // Set initial button appearance
    watchlistButton.textContent = isOnWatchlist
        ? '✓ Remove from Watchlist'
        : '+ Add to Watchlist';

    watchlistMessage.textContent = isOnWatchlist
        ? 'This movie is on your Watchlist.'
        : 'Save this movie to watch later.';


    // Handle adding and removing movies
    watchlistButton.addEventListener('click', async function() {

        watchlistButton.disabled = true;

        if (isOnWatchlist) {

            watchlistButton.textContent = 'Removing...';

            const { error: deleteError } = await supabase
                .from('user_watchlist')
                .delete()
                .eq('movie_id', movieId)
                .eq('user_id', user.id);

            if (deleteError) {

                console.error('Error removing movie:', deleteError);

                watchlistMessage.textContent =
                    'Unable to remove movie. Please try again.';

                watchlistButton.textContent =
                    '✓ Remove from Watchlist';

            } else {

                isOnWatchlist = false;

                watchlistButton.textContent =
                    '+ Add to Watchlist';

                watchlistMessage.textContent =
                    'Movie removed from your Watchlist.';

            }

        } else {

            watchlistButton.textContent = 'Adding...';

            const { error: insertError } = await supabase
                .from('user_watchlist')
                .insert({
                    user_id: user.id,
                    movie_id: movieId
                });

            if (insertError) {

                console.error('Error adding movie:', insertError);

                watchlistMessage.textContent =
                    'Unable to add movie. Please try again.';

                watchlistButton.textContent =
                    '+ Add to Watchlist';

            } else {

                isOnWatchlist = true;

                watchlistButton.textContent =
                    '✓ Remove from Watchlist';

                watchlistMessage.textContent =
                    'Movie added to your Watchlist!';

            }

        }

        watchlistButton.disabled = false;

    });
}


// Load community reviews and calculate average
async function loadCommunityReviews(movieId) {

    const reviewList = document.getElementById('communityReviewList');
    const communityAverage = document.getElementById('communityAverage');
    const communityCount = document.getElementById('communityCount');

    const { data: reviews, error } = await supabase
        .from('community_reviews')
        .select('grade, review_text, user_id')
        .eq('movie_id', movieId);

    if (error) {
        console.error('Error loading community reviews:', error);

        reviewList.textContent = 'Unable to load community reviews.';
        communityAverage.textContent = 'Unable to load';
        communityCount.textContent = '';

        return;
    }

    reviewList.innerHTML = '';

    if (!reviews || reviews.length === 0) {

        communityAverage.textContent = 'No ratings yet';
        communityCount.textContent = '0 reviews';

        reviewList.textContent = 'No community reviews yet. Be the first!';

        return;
    }

    // Calculate average
    const total = reviews.reduce(function(sum, review) {
        return sum + (gradeValues[review.grade] ?? 0);
    }, 0);

    const average = total / reviews.length;

    communityAverage.textContent = getAverageGrade(average);

    communityCount.textContent =
        reviews.length + (reviews.length === 1 ? ' review' : ' reviews');


    // Fetch reviewer usernames
    const userIds = [
        ...new Set(reviews.map(review => review.user_id))
    ];

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

    if (profileError) {
        console.error('Error loading reviewer usernames:', profileError);
    }

    // Create username lookup
    const usernameLookup = {};

    if (profiles) {
        profiles.forEach(function(profile) {
            usernameLookup[profile.id] = profile.username;
        });
    }


    // Display individual reviews
    reviews.forEach(function(review) {

        const reviewItem = document.createElement('div');
        reviewItem.className = 'community-review-item';

        // Clickable reviewer username
        const reviewer = document.createElement('p');
        reviewer.className = 'community-review-member';

        const username = usernameLookup[review.user_id];

        if (username) {

            const profileLink = document.createElement('a');

            profileLink.href =
                'profile.html?username=' + encodeURIComponent(username);

            profileLink.textContent = '@' + username;
            profileLink.style.color = 'inherit';
            profileLink.style.textDecoration = 'none';

            reviewer.appendChild(profileLink);

        } else {

            reviewer.textContent = 'Community Member';

        }

        // Community grade
        const grade = document.createElement('h4');
        grade.textContent = 'Community Grade: ' + review.grade;

        reviewItem.appendChild(reviewer);
        reviewItem.appendChild(grade);

        if (review.review_text) {

            const reviewText = document.createElement('p');
            reviewText.textContent = review.review_text;

            reviewItem.appendChild(reviewText);
        }

        reviewList.appendChild(reviewItem);
    });
}


// Load movie information
async function loadMovie() {

    const params = new URLSearchParams(window.location.search);
    const slug = params.get('id');

    // Find movie
    const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (movieError || !movie) {

        document.getElementById('movieTitle').textContent = 'Movie not found';
        console.error('Error loading movie:', movieError);

        return;
    }

    // Find editorial review
    const { data: review, error: reviewError } = await supabase
        .from('editorial_reviews')
        .select('grade, review_text')
        .eq('movie_id', movie.id)
        .maybeSingle();

    if (reviewError) {
        console.error('Error loading editorial review:', reviewError);
        return;
    }

    // Display movie details
    document.title = movie.title + ' | ReelRated';

    document.getElementById('movieTitle').textContent = movie.title;
    document.getElementById('movieYear').textContent = movie.year;
    document.getElementById('movieGenre').textContent = movie.genre;
    document.getElementById('movieImage').src = movie.poster_url;
    document.getElementById('movieSynopsis').textContent = movie.synopsis;

    document.getElementById('movieGrade').textContent =
        review ? review.grade : 'Not yet rated';

    document.getElementById('movieReview').textContent =
        review ? review.review_text : 'Review coming soon.';


    // Check login status
    const { data: { user } } = await supabase.auth.getUser();

    // Load Watchlist button
    await loadWatchlist(movie.id, user);

    const gradeSection = document.querySelector('.community-grade');
    const textSection = document.querySelector('.community-review-text');
    const submitButton = document.getElementById('submitCommunityReview');
    const reviewMessage = document.getElementById('reviewMessage');

    let existingReview = null;

    if (user) {

        gradeSection.hidden = false;
        textSection.hidden = false;
        submitButton.hidden = false;

        // Check whether this user has already reviewed this movie
        const { data: userReview, error: userReviewError } = await supabase
            .from('community_reviews')
            .select('grade, review_text')
            .eq('movie_id', movie.id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (userReviewError) {

            console.error('Error checking your review:', userReviewError);
            reviewMessage.textContent = 'Unable to check your existing review.';

        } else if (userReview) {

            existingReview = userReview;

            document.getElementById('communityGrade').value =
                userReview.grade;

            document.getElementById('communityReviewText').value =
                userReview.review_text || '';

            submitButton.textContent = 'Update Review';

            reviewMessage.textContent =
                'You have already reviewed this movie. You can update your review below.';

        } else {

            submitButton.textContent = 'Submit Review';

            reviewMessage.textContent =
                'You are logged in and ready to review!';

        }

    } else {

        gradeSection.hidden = true;
        textSection.hidden = true;
        submitButton.hidden = true;

        reviewMessage.innerHTML =
            'Want to share your verdict? <a href="auth.html">Log in or create an account</a> to submit a review.';
    }


    // Load community average and reviews
    await loadCommunityReviews(movie.id);


    // Handle review submission or update
    submitButton.addEventListener('click', async function() {

        const { data: { user: currentUser } } =
            await supabase.auth.getUser();

        if (!currentUser) {

            reviewMessage.textContent =
                'Please log in before submitting a review.';

            return;
        }

        const grade = document.getElementById('communityGrade').value;

        const reviewText = document
            .getElementById('communityReviewText')
            .value.trim();

        if (!grade) {

            reviewMessage.textContent = 'Please select a grade first.';
            return;
        }

        submitButton.disabled = true;

        submitButton.textContent = existingReview
            ? 'Updating...'
            : 'Submitting...';


        let error;

        if (existingReview) {

            // Update the existing review
            const result = await supabase
                .from('community_reviews')
                .update({
                    grade: grade,
                    review_text: reviewText || null
                })
                .eq('movie_id', movie.id)
                .eq('user_id', currentUser.id);

            error = result.error;

        } else {

            // Create a new review
            const result = await supabase
                .from('community_reviews')
                .insert({
                    movie_id: movie.id,
                    user_id: currentUser.id,
                    grade: grade,
                    review_text: reviewText || null
                });

            error = result.error;
        }


        if (error) {

            console.error('Error saving review:', error);

            reviewMessage.textContent =
                'Something went wrong: ' + error.message;

        } else {

            reviewMessage.textContent = existingReview
                ? 'Your review has been updated!'
                : 'Your review has been submitted!';

            // Mark this as an existing review
            existingReview = {
                grade: grade,
                review_text: reviewText
            };

            submitButton.textContent = 'Update Review';

            // Refresh community average and reviews
            await loadCommunityReviews(movie.id);
        }

        submitButton.disabled = false;

        if (existingReview) {
            submitButton.textContent = 'Update Review';
        } else {
            submitButton.textContent = 'Submit Review';
        }

    });

    console.log('Movie loaded from Supabase:', movie.title);
}


// Start page
loadMovie();
