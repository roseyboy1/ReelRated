
import { supabase } from './supabase.js';

// Load the five most recent community reviews
async function loadLatestReviews() {

    const reviewList = document.getElementById('latestReviewsList');

    if (!reviewList) return;

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
                poster_url
            )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error loading latest reviews:', error);
        reviewList.textContent = 'Unable to load the latest reviews.';
        return;
    }

    reviewList.innerHTML = '';

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
        console.error('Error loading usernames:', profileError);
    }

    const usernameLookup = {};

    if (profiles) {
        profiles.forEach(function(profile) {
            usernameLookup[profile.id] = profile.username;
        });
    }

    // Display each review
    reviews.forEach(function(review) {

        const movie = review.movies;
        if (!movie) return;

        const card = document.createElement('article');
        card.className = 'latest-review-card';

        const poster = document.createElement('img');
        poster.src = movie.poster_url;
        poster.alt = movie.title + ' poster';

        const details = document.createElement('div');
        details.className = 'latest-review-details';

        const title = document.createElement('h3');
        title.textContent = movie.title;

        // Clickable reviewer username
        const member = document.createElement('p');
        member.className = 'latest-review-member';

        const username = usernameLookup[review.user_id];

        if (username) {
            const profileLink = document.createElement('a');
            profileLink.href =
                'profile.html?username=' + encodeURIComponent(username);
            profileLink.textContent = '@' + username;
            profileLink.style.color = 'inherit';
            profileLink.style.textDecoration = 'none';

            member.appendChild(profileLink);
        } else {
            member.textContent = 'Community Member';
        }

        const writtenReview = document.createElement('p');
        writtenReview.textContent =
            review.review_text || 'Rated this movie.';

        const movieLink = document.createElement('a');
        movieLink.href =
            'movie.html?id=' + encodeURIComponent(movie.slug);
        movieLink.textContent = 'View Movie';

        const grade = document.createElement('strong');
        grade.className = 'latest-review-grade';
        grade.textContent = review.grade;

        details.appendChild(title);
        details.appendChild(member);
        details.appendChild(writtenReview);
        details.appendChild(movieLink);

        card.appendChild(poster);
        card.appendChild(details);
        card.appendChild(grade);

        reviewList.appendChild(card);
    });

    console.log('Latest reviews loaded successfully!');
}

loadLatestReviews();
