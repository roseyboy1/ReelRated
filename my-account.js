
import { supabase } from './supabase.js';

const gradeValues = {
    'A+': 12, 'A': 11, 'A-': 10,
    'B+': 9, 'B': 8, 'B-': 7,
    'C+': 6, 'C': 5, 'C-': 4,
    'D+': 3, 'D': 2, 'D-': 1, 'F': 0
};

function getAverageGrade(average) {
    const grades = [
        'F', 'D-', 'D', 'D+',
        'C-', 'C', 'C+',
        'B-', 'B', 'B+',
        'A-', 'A', 'A+'
    ];

    return grades[Math.max(0, Math.min(12, Math.round(average)))];
}


// CHECK ADMIN ACCESS AND DISPLAY DASHBOARD LINK
async function loadAdminDashboardLink() {

    const adminSection = document.getElementById(
        'adminDashboardSection'
    );

    // Keep the section hidden unless admin access is confirmed.
    adminSection.hidden = true;

    const { data: isAdmin, error } = await supabase.rpc('is_admin');

    if (error) {
        console.error('Unable to check administrator access:', error);
        return;
    }

    if (isAdmin === true) {
        adminSection.hidden = false;
    }
}


// LOAD USER PROFILE AND USERNAME
async function loadUsername(user) {

    const usernameInput = document.getElementById('usernameInput');
    const usernameMessage = document.getElementById('usernameMessage');
    const bioInput = document.getElementById('bioInput');
    const bioDisplay = document.getElementById('bioDisplay');
    const editBioButton = document.getElementById('editBioButton');

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, bio')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error loading profile:', error);
        usernameMessage.textContent = 'Unable to load your profile.';
        bioDisplay.textContent = 'Unable to load your bio.';
        return;
    }

    if (profile) {

        usernameInput.value = profile.username;
        usernameMessage.textContent = 'Your username is saved.';

        const savedBio = profile.bio || '';

        bioInput.value = savedBio;

        if (savedBio.trim()) {
            bioDisplay.textContent = savedBio;
            editBioButton.textContent = 'Change Bio';
        } else {
            bioDisplay.textContent = 'You haven’t added a bio yet.';
            editBioButton.textContent = 'Add Bio';
        }

    } else {

        bioDisplay.textContent = 'You haven’t added a bio yet.';
        editBioButton.textContent = 'Add Bio';

    }
}


// SAVE USERNAME
async function saveUsername(user) {

    const usernameForm = document.getElementById('usernameForm');
    const usernameInput = document.getElementById('usernameInput');
    const usernameMessage = document.getElementById('usernameMessage');

    usernameForm.addEventListener('submit', async function(event) {

        event.preventDefault();

        const username = usernameInput.value.trim();
        usernameMessage.textContent = '';

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            usernameMessage.textContent =
                'Use 3–20 characters: letters, numbers or underscores.';
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                username: username
            });

        if (error) {

            console.error('Error saving username:', error);

            if (error.code === '23505') {
                usernameMessage.textContent =
                    'That username is already taken. Try another one.';
            } else {
                usernameMessage.textContent =
                    'Unable to save username. Please try again.';
            }

            return;
        }

        usernameMessage.textContent = 'Username saved successfully!';
    });
}


// SAVE PROFILE BIO
async function saveBio(user) {

    const bioForm = document.getElementById('bioForm');
    const bioInput = document.getElementById('bioInput');
    const bioMessage = document.getElementById('bioMessage');
    const bioDisplay = document.getElementById('bioDisplay');
    const editBioButton = document.getElementById('editBioButton');
    const cancelBioButton = document.getElementById('cancelBioButton');

    let savedBio = bioInput.value.trim();

    editBioButton.addEventListener('click', function() {

        bioInput.value = savedBio;
        bioMessage.textContent = '';
        bioForm.hidden = false;
        editBioButton.hidden = true;
        bioInput.focus();
    });

    cancelBioButton.addEventListener('click', function() {

        bioInput.value = savedBio;
        bioMessage.textContent = '';
        bioForm.hidden = true;
        editBioButton.hidden = false;
    });

    bioForm.addEventListener('submit', async function(event) {

        event.preventDefault();

        const bio = bioInput.value.trim();

        bioMessage.textContent = '';

        if (bio.length > 250) {
            bioMessage.textContent =
                'Your bio must be 250 characters or fewer.';
            return;
        }

        const saveButton = bioForm.querySelector('button[type="submit"]');

        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        const { data, error } = await supabase
            .from('profiles')
            .update({ bio: bio })
            .eq('id', user.id)
            .select('id');

        saveButton.disabled = false;
        saveButton.textContent = 'Save Bio';

        if (error) {

            console.error('Error saving bio:', error);

            bioMessage.textContent =
                'Unable to save your bio. Please try again.';

            return;
        }

        if (!data || data.length === 0) {
            bioMessage.textContent =
                'Profile not found. Please save your username first.';
            return;
        }

        savedBio = bio;

        if (savedBio) {
            bioDisplay.textContent = savedBio;
            editBioButton.textContent = 'Change Bio';
        } else {
            bioDisplay.textContent = 'You haven’t added a bio yet.';
            editBioButton.textContent = 'Add Bio';
        }

        bioForm.hidden = true;
        editBioButton.hidden = false;
    });
}


// LOAD AND DISPLAY FAVOURITE MOVIES
async function loadFavoriteMovies(user, statusMessage = '') {

    const favoriteList = document.getElementById('favoriteMoviesList');
    const favoriteMessage = document.getElementById('favoriteMoviesMessage');

    favoriteList.innerHTML = '<p>Loading favourite movies...</p>';
    favoriteMessage.textContent = '';

    const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select('id, title, year, poster_url, slug')
        .order('title');

    if (moviesError) {
        console.error('Error loading movies:', moviesError);
        favoriteList.textContent = 'Unable to load movies.';
        return;
    }

    const { data: favorites, error: favoritesError } = await supabase
        .from('user_favorite_movies')
        .select('id, movie_id, movies(id, title, year, poster_url, slug)')
        .eq('user_id', user.id);

    if (favoritesError) {
        console.error('Error loading favourites:', favoritesError);
        favoriteList.textContent = 'Unable to load your favourite movies.';
        return;
    }

    const favoriteCount = favorites.length;
    const maximumFavorites = 3;
    const slotsRemaining = maximumFavorites - favoriteCount;

    const countDisplay = document.createElement('p');
    countDisplay.className = 'account-description';
    countDisplay.textContent =
        favoriteCount + ' of 3 favourite movies selected';

    favoriteList.innerHTML = '';
    favoriteList.appendChild(countDisplay);

    const selectorArea = document.createElement('div');
    selectorArea.className = 'favorite-movie-selector';

    const movieSelect = document.createElement('select');
    movieSelect.id = 'favoriteMovieSelect';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a movie...';

    movieSelect.appendChild(placeholder);

    const savedMovieIds = favorites.map(favorite => favorite.movie_id);

    movies.forEach(function(movie) {

        const option = document.createElement('option');

        option.value = movie.id;
        option.textContent = movie.title + ' (' + movie.year + ')';

        if (savedMovieIds.includes(movie.id)) {
            option.disabled = true;
        }

        movieSelect.appendChild(option);
    });

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'write-button';
    addButton.textContent = 'Add Favourite';

    if (slotsRemaining === 0) {

        addButton.disabled = true;
        movieSelect.disabled = true;

        favoriteMessage.textContent =
            'You have selected all three favourites. Remove one to choose another.';
    }

    selectorArea.appendChild(movieSelect);
    selectorArea.appendChild(addButton);

    favoriteList.appendChild(selectorArea);

    const savedList = document.createElement('div');
    savedList.className = 'favorite-movie-grid';

    if (favorites.length === 0) {

        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'account-description';
        emptyMessage.textContent =
            'You have not selected any favourite movies yet.';

        savedList.appendChild(emptyMessage);
    }

    favorites.forEach(function(favorite) {

        const movie = favorite.movies;

        if (!movie) return;

        const card = document.createElement('article');
        card.className = 'favorite-movie-card';

        const movieUrl =
            'movie.html?id=' + encodeURIComponent(movie.slug);

        // CLICKABLE POSTER
        const posterLink = document.createElement('a');
        posterLink.href = movieUrl;
        posterLink.className = 'favorite-movie-link';

        const poster = document.createElement('img');
        poster.src = movie.poster_url;
        poster.alt = movie.title + ' poster';

        posterLink.appendChild(poster);

        // CLICKABLE TITLE
        const titleLink = document.createElement('a');
        titleLink.href = movieUrl;
        titleLink.className = 'favorite-movie-link';

        const title = document.createElement('h3');
        title.textContent = movie.title;

        titleLink.appendChild(title);

        const year = document.createElement('p');
        year.textContent = movie.year;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'favorite-remove-button';
        removeButton.textContent = 'Remove';

        removeButton.addEventListener('click', async function() {

            removeButton.disabled = true;
            removeButton.textContent = 'Removing...';

            const { error } = await supabase
                .from('user_favorite_movies')
                .delete()
                .eq('id', favorite.id)
                .eq('user_id', user.id);

            if (error) {

                console.error('Error removing favourite:', error);

                favoriteMessage.textContent =
                    'Unable to remove favourite. Please try again.';

                removeButton.disabled = false;
                removeButton.textContent = 'Remove';

                return;
            }

            await loadFavoriteMovies(user, 'Favourite removed successfully!');
        });

        card.appendChild(posterLink);
        card.appendChild(titleLink);
        card.appendChild(year);
        card.appendChild(removeButton);

        savedList.appendChild(card);
    });

    favoriteList.appendChild(savedList);

    if (statusMessage) {
        favoriteMessage.textContent = statusMessage;
    }

    addButton.addEventListener('click', async function() {

        const movieId = movieSelect.value;

        favoriteMessage.textContent = '';

        if (!movieId) {
            favoriteMessage.textContent = 'Please choose a movie first.';
            return;
        }

        if (favoriteCount >= maximumFavorites) {
            favoriteMessage.textContent =
                'You can only select three favourite movies.';
            return;
        }

        addButton.disabled = true;
        addButton.textContent = 'Adding...';

        const { error } = await supabase
            .from('user_favorite_movies')
            .insert({
                user_id: user.id,
                movie_id: Number(movieId)
            });

        if (error) {

            console.error('Error adding favourite:', error);

            favoriteMessage.textContent =
                'Unable to add favourite. You can only select three movies.';

            addButton.disabled = false;
            addButton.textContent = 'Add Favourite';

            return;
        }

        await loadFavoriteMovies(user, 'Favourite movie added successfully!');
    });
}


// LOAD AND DISPLAY WATCHLIST
async function loadWatchlist(user) {

    const watchlistList = document.getElementById('watchlistMoviesList');

    watchlistList.innerHTML = '<p>Loading your Watchlist...</p>';

    const { data: watchlist, error } = await supabase
        .from('user_watchlist')
        .select(`
            id,
            movie_id,
            created_at,
            movies (
                id,
                title,
                year,
                poster_url,
                slug
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {

        console.error('Error loading Watchlist:', error);

        watchlistList.textContent =
            'Unable to load your Watchlist. Please refresh the page.';

        return;
    }

    watchlistList.innerHTML = '';

    if (!watchlist || watchlist.length === 0) {

        watchlistList.textContent =
            'Your Watchlist is empty. Visit a movie page and add something to watch later!';

        return;
    }

    const watchlistGrid = document.createElement('div');
    watchlistGrid.className = 'favorite-movie-grid';

    watchlist.forEach(function(item) {

        const movie = item.movies;

        if (!movie) return;

        const card = document.createElement('article');
        card.className = 'favorite-movie-card';

        const poster = document.createElement('img');
        poster.src = movie.poster_url;
        poster.alt = movie.title + ' poster';

        const title = document.createElement('h3');
        title.textContent = movie.title;

        const year = document.createElement('p');
        year.textContent = movie.year;

        const movieLink = document.createElement('a');
        movieLink.href =
            'movie.html?id=' + encodeURIComponent(movie.slug);
        movieLink.textContent = 'View Movie';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'favorite-remove-button';
        removeButton.textContent = 'Remove';

        removeButton.addEventListener('click', async function() {

            removeButton.disabled = true;
            removeButton.textContent = 'Removing...';

            const { error: deleteError } = await supabase
                .from('user_watchlist')
                .delete()
                .eq('id', item.id)
                .eq('user_id', user.id);

            if (deleteError) {

                console.error('Error removing Watchlist movie:', deleteError);

                removeButton.disabled = false;
                removeButton.textContent = 'Remove';

                alert('Unable to remove this movie. Please try again.');

                return;
            }

            await loadWatchlist(user);
        });

        card.appendChild(poster);
        card.appendChild(title);
        card.appendChild(year);
        card.appendChild(movieLink);
        card.appendChild(removeButton);

        watchlistGrid.appendChild(card);
    });

    watchlistList.appendChild(watchlistGrid);
}


// LOAD ACCOUNT DETAILS
async function loadAccount() {

    const accountEmail = document.getElementById('accountEmail');
    const moviesReviewed = document.getElementById('moviesReviewed');
    const averageGrade = document.getElementById('averageGrade');
    const reviewsList = document.getElementById('myReviewsList');

    const { data: { user }, error: authError } =
        await supabase.auth.getUser();

    if (authError || !user) {
        window.location.href = 'auth.html';
        return;
    }

    accountEmail.textContent = user.email;

    // Check whether this account is an administrator.
    await loadAdminDashboardLink();

    await loadUsername(user);
    saveUsername(user);
    saveBio(user);

    await loadFavoriteMovies(user);
    await loadWatchlist(user);

    const { data: reviews, error } = await supabase
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
        .eq('user_id', user.id);

    if (error) {
        console.error('Error loading account reviews:', error);
        reviewsList.textContent =
            'Unable to load your reviews. Please refresh the page.';
        return;
    }

    moviesReviewed.textContent = reviews.length;

    if (reviews.length > 0) {

        const total = reviews.reduce(function(sum, review) {
            return sum + (gradeValues[review.grade] ?? 0);
        }, 0);

        averageGrade.textContent =
            getAverageGrade(total / reviews.length);

    } else {

        averageGrade.textContent = '—';

    }

    reviewsList.innerHTML = '';

    if (reviews.length === 0) {

        reviewsList.textContent =
            'You haven’t reviewed any movies yet. Head over to the movies page and share your verdict!';

        return;
    }

    reviews.forEach(function(review) {

        const movie = review.movies;

        if (!movie) return;

        const reviewCard = document.createElement('article');
        reviewCard.className = 'account-review-card';

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
        movieLink.textContent = 'View Movie / Edit Review';

        const grade = document.createElement('strong');
        grade.className = 'account-review-grade';
        grade.textContent = review.grade;

        details.appendChild(title);
        details.appendChild(year);
        details.appendChild(writtenReview);
        details.appendChild(movieLink);

        reviewCard.appendChild(poster);
        reviewCard.appendChild(details);
        reviewCard.appendChild(grade);

        reviewsList.appendChild(reviewCard);
    });

    console.log('Account loaded successfully!');
}

loadAccount();
