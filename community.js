
import { supabase } from './supabase.js';

// Grade values for sorting
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


// Convert review date into a relative timestamp
function getTimeAgo(dateString) {

    const reviewDate = new Date(dateString);
    const now = new Date();

    const seconds = Math.floor((now - reviewDate) / 1000);

    if (seconds < 60) {
        return 'Just now';
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return days + (days === 1 ? ' day ago' : ' days ago');
    }

    return reviewDate.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}


// Display community reviews
function displayReviews(reviews, usernameLookup) {

    const reviewList = document.getElementById('communityReviewsList');

    reviewList.innerHTML = '';

    if (reviews.length === 0) {

        reviewList.textContent =
            'No reviews match your search or filters. Try changing them.';

        return;
    }

    reviews.forEach(function(review) {

        const movie = review.movies;
        if (!movie) return;

        const card = document.createElement('article');
        card.className = 'community-review-card';

        const poster = document.createElement('img');
        poster.src = movie.poster_url;
        poster.alt = movie.title + ' poster';

        const content = document.createElement('div');
        content.className = 'community-review-content';

        const title = document.createElement('h2');
        title.textContent = movie.title + ' (' + movie.year + ')';

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

        // Review timestamp
        const timestamp = document.createElement('p');
        timestamp.className = 'community-review-timestamp';
        timestamp.textContent = getTimeAgo(review.created_at);

        // Written review
        const writtenReview = document.createElement('p');
        writtenReview.className = 'community-review-text';
        writtenReview.textContent =
            review.review_text || 'No written review added.';

        // Movie link
        const movieLink = document.createElement('a');

        movieLink.href =
            'movie.html?id=' + encodeURIComponent(movie.slug);

        movieLink.textContent = 'View Movie';

        // Grade
        const grade = document.createElement('strong');
        grade.className = 'community-review-grade';
        grade.textContent = review.grade;

        content.appendChild(title);
        content.appendChild(reviewer);
        content.appendChild(timestamp);
        content.appendChild(writtenReview);
        content.appendChild(movieLink);

        card.appendChild(poster);
        card.appendChild(content);
        card.appendChild(grade);

        reviewList.appendChild(card);
    });
}


// Filter and sort community reviews
function updateReviews(reviews, usernameLookup) {

    const sortSelect = document.getElementById('reviewSort');
    const gradeFilter = document.getElementById('gradeFilter');
    const movieSearch = document.getElementById('movieReviewSearch');

    let displayedReviews = [...reviews];

    // Filter by movie title
    const searchTerm = movieSearch.value.trim().toLowerCase();

    if (searchTerm) {

        displayedReviews = displayedReviews.filter(function(review) {

            const movieTitle = review.movies?.title || '';

            return movieTitle.toLowerCase().includes(searchTerm);

        });

    }

    // Filter by grade
    const selectedGrade = gradeFilter.value;

    if (selectedGrade !== 'all') {

        displayedReviews = displayedReviews.filter(function(review) {
            return review.grade === selectedGrade;
        });

    }

    // Sort reviews
    const sortOption = sortSelect.value;

    if (sortOption === 'newest') {

        displayedReviews.sort(function(a, b) {
            return new Date(b.created_at) - new Date(a.created_at);
        });

    } else if (sortOption === 'oldest') {

        displayedReviews.sort(function(a, b) {
            return new Date(a.created_at) - new Date(b.created_at);
        });

    } else if (sortOption === 'highest') {

        displayedReviews.sort(function(a, b) {
            return (gradeValues[b.grade] ?? -1) -
                   (gradeValues[a.grade] ?? -1);
        });

    } else if (sortOption === 'lowest') {

        displayedReviews.sort(function(a, b) {
            return (gradeValues[a.grade] ?? -1) -
                   (gradeValues[b.grade] ?? -1);
        });

    }

    displayReviews(displayedReviews, usernameLookup);

}


// Load all community reviews
async function loadCommunityReviews() {

    const reviewList = document.getElementById('communityReviewsList');

    const sortSelect = document.getElementById('reviewSort');
    const gradeFilter = document.getElementById('gradeFilter');
    const movieSearch = document.getElementById('movieReviewSearch');

    const { data: reviews, error } = await supabase
        .from('community_reviews')
        .select(`
            grade,
            review_text,
            created_at,
            user_id,
            movies (
                title,
                slug,
                poster_url,
                year
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {

        console.error('Error loading community reviews:', error);

        reviewList.textContent =
            'Unable to load community reviews. Please refresh the page.';

        return;
    }

    if (!reviews || reviews.length === 0) {

        reviewList.textContent =
            'No community reviews yet. Be the first to share your verdict!';

        return;
    }

    // Fetch reviewer usernames
    const userIds = [
        ...new Set(reviews.map(review => review.user_id))
    ];

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

    if (profileError) {
        console.error('Error loading reviewer profiles:', profileError);
    }

    // Create username lookup
    const usernameLookup = {};

    if (profiles) {

        profiles.forEach(function(profile) {
            usernameLookup[profile.id] = profile.username;
        });

    }

    // Initial display
    updateReviews(reviews, usernameLookup);

    // Sorting changes
    sortSelect.addEventListener('change', function() {
        updateReviews(reviews, usernameLookup);
    });

    // Grade filter changes
    gradeFilter.addEventListener('change', function() {
        updateReviews(reviews, usernameLookup);
    });

    // Movie search changes
    movieSearch.addEventListener('input', function() {
        updateReviews(reviews, usernameLookup);
    });

    console.log('Community reviews loaded successfully!');
}


// Start page
loadCommunityReviews();
