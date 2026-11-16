
import { supabase } from './supabase.js';

const gradeOptions = [
    'A+', 'A', 'A-', 'B+', 'B', 'B-',
    'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'
];


// Check administrator access
async function checkAdminAccess() {
    const { data: { user }, error: authError } =
        await supabase.auth.getUser();

    if (authError || !user) {
        window.location.href = 'auth.html';
        return false;
    }

    const { data: isAdmin, error } = await supabase.rpc('is_admin');

    if (error || !isAdmin) {
        alert('You do not have permission to access the admin dashboard.');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}


// Generate a URL-friendly movie slug
function createSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}


// Add a movie and its editorial review
async function addMovie(event) {
    event.preventDefault();

    const message = document.getElementById('addMovieMessage');
    const button = document.querySelector(
        '#addMovieForm button[type="submit"]'
    );

    const title = document.getElementById('movieTitle').value.trim();

    const movie = {
        title,
        slug: createSlug(title),
        year: Number(document.getElementById('movieYear').value),
        genre: document.getElementById('movieGenre').value.trim(),
        poster_url: document.getElementById('moviePoster').value.trim(),
        synopsis: document.getElementById('movieSynopsis').value.trim(),
        status: 'draft'
    };

    const editorialReview = {
        grade: document.getElementById('editorialGrade').value,
        review_text: document.getElementById('editorialReview').value.trim()
    };

    message.textContent = 'Adding movie as a draft...';
    button.disabled = true;

    try {
        const { data: newMovie, error: movieError } = await supabase
            .from('movies')
            .insert(movie)
            .select('id')
            .single();

        if (movieError) throw new Error(movieError.message);

        const { error: reviewError } = await supabase
            .from('editorial_reviews')
            .insert({
                movie_id: newMovie.id,
                grade: editorialReview.grade,
                review_text: editorialReview.review_text
            });

        if (reviewError) {
            const { error: rollbackError } = await supabase
                .from('movies')
                .delete()
                .eq('id', newMovie.id);

            if (rollbackError) {
                throw new Error(
                    'The movie was added, but its review failed: ' +
                    reviewError.message +
                    '. Cleanup also failed: ' +
                    rollbackError.message
                );
            }

            throw new Error(
                'Editorial review could not be saved. The movie was removed. ' +
                reviewError.message
            );
        }

        message.textContent =
            title + ' was successfully added to Draft Movies!';

        document.getElementById('addMovieForm').reset();

        await loadMovies();

    } catch (error) {
        message.textContent = 'Error: ' + error.message;

    } finally {
        button.disabled = false;
    }
}


// Create a labelled form field
function createField(labelText, value, type = 'text') {
    const group = document.createElement('div');
    group.className = 'admin-form-group';

    const label = document.createElement('label');
    label.textContent = labelText;

    const field = type === 'textarea'
        ? document.createElement('textarea')
        : document.createElement('input');

    if (type !== 'textarea') {
        field.type = type;
    } else {
        field.rows = labelText === 'Editorial Review' ? 5 : 3;
    }

    field.value = value ?? '';
    label.htmlFor = 'edit-' + labelText.toLowerCase().replace(/\s+/g, '-');

    field.id = label.htmlFor;
    field.required = true;

    group.append(label, field);

    return { group, field };
}


// Create the editing form for a movie
function showEditForm(movie, editorialReview, movieCard) {
    const existingForm = movieCard.querySelector('.admin-edit-form');

    if (existingForm) {
        existingForm.remove();
        return;
    }

    document.querySelectorAll('.admin-edit-form').forEach(form => form.remove());

    const form = document.createElement('form');
    form.className = 'admin-edit-form';

    const heading = document.createElement('h3');
    heading.textContent = 'Edit ' + movie.title;
    form.appendChild(heading);

    const fields = [
        createField('Movie Title', movie.title),
        createField('Release Year', movie.year, 'number'),
        createField('Genre', movie.genre),
        createField('Poster Image URL', movie.poster_url, 'url'),
        createField('Synopsis', movie.synopsis, 'textarea'),
        createField('Editorial Review', editorialReview?.review_text, 'textarea')
    ];

    fields.forEach(item => form.appendChild(item.group));

    const gradeGroup = document.createElement('div');
    gradeGroup.className = 'admin-form-group';

    const gradeLabel = document.createElement('label');
    gradeLabel.textContent = 'Editorial Grade';

    const gradeSelect = document.createElement('select');
    gradeSelect.required = true;

    gradeOptions.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        gradeSelect.appendChild(option);
    });

    gradeSelect.value = editorialReview?.grade || '';

    gradeGroup.append(gradeLabel, gradeSelect);
    form.appendChild(gradeGroup);

    const message = document.createElement('p');
    message.className = 'admin-edit-message';
    form.appendChild(message);

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'admin-submit-button';
    saveButton.textContent = 'Save Changes';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'admin-cancel-button';
    cancelButton.textContent = 'Cancel';

    cancelButton.addEventListener('click', () => form.remove());

    form.append(saveButton, cancelButton);

    form.addEventListener('submit', async event => {
        event.preventDefault();

        saveButton.disabled = true;
        message.textContent = 'Saving changes...';

        const updatedMovie = {
            title: fields[0].field.value.trim(),
            slug: movie.slug,
            year: Number(fields[1].field.value),
            genre: fields[2].field.value.trim(),
            poster_url: fields[3].field.value.trim(),
            synopsis: fields[4].field.value.trim()
        };

        const updatedReview = {
            grade: gradeSelect.value,
            review_text: fields[5].field.value.trim()
        };

        try {
            const { error: movieError } = await supabase
                .from('movies')
                .update(updatedMovie)
                .eq('id', movie.id);

            if (movieError) throw new Error(movieError.message);

            let reviewError;

            if (editorialReview) {
                const result = await supabase
                    .from('editorial_reviews')
                    .update(updatedReview)
                    .eq('movie_id', movie.id);

                reviewError = result.error;
            } else {
                const result = await supabase
                    .from('editorial_reviews')
                    .insert({
                        movie_id: movie.id,
                        ...updatedReview
                    });

                reviewError = result.error;
            }

            if (reviewError) throw new Error(reviewError.message);

            message.textContent = 'Changes saved successfully!';

            await loadMovies();

        } catch (error) {
            message.textContent = 'Error: ' + error.message;
            saveButton.disabled = false;
        }
    });

    movieCard.appendChild(form);
}


// Publish or unpublish a movie
async function updateMovieStatus(movie, newStatus, statusButton) {
    const action = newStatus === 'published' ? 'Publishing' : 'Moving to drafts';

    statusButton.disabled = true;
    statusButton.textContent = action + '...';

    try {
        const { error } = await supabase
            .from('movies')
            .update({ status: newStatus })
            .eq('id', movie.id);

        if (error) throw new Error(error.message);

        await loadMovies();

    } catch (error) {
        alert('Could not update movie status: ' + error.message);

        statusButton.disabled = false;
        statusButton.textContent =
            newStatus === 'published' ? 'Publish Movie' : 'Unpublish Movie';
    }
}


// Delete a movie and all associated reviews
async function deleteMovie(movie, deleteButton) {
    const confirmed = window.confirm(
        'Are you sure you want to permanently delete "' +
        movie.title +
        '"?\n\n' +
        'This will also delete:\n' +
        '- Its editorial review\n' +
        '- All community reviews\n' +
        '- Users\' favourites containing this movie\n' +
        '- Users\' watchlist entries containing this movie\n\n' +
        'This action cannot be undone.'
    );

    if (!confirmed) return;

    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting...';

    try {
        const { error } = await supabase.rpc('admin_delete_movie', {
            p_movie_id: movie.id
        });

        if (error) throw new Error(error.message);

        await loadMovies();

        alert('"' + movie.title + '" was successfully deleted.');

    } catch (error) {
        alert('Could not delete movie: ' + error.message);

        deleteButton.disabled = false;
        deleteButton.textContent = 'Delete Movie';
    }
}


// Create a movie section
function createMovieSection(title, description, movies, reviews, status) {
    const section = document.createElement('section');
    section.className = 'admin-movie-section';

    const heading = document.createElement('div');
    heading.className = 'admin-section-heading';

    const headingContent = document.createElement('div');

    const titleElement = document.createElement('h2');
    titleElement.textContent = title;

    const descriptionElement = document.createElement('p');
    descriptionElement.textContent = description;

    headingContent.append(titleElement, descriptionElement);

    const count = document.createElement('span');
    count.className = 'admin-movie-count';
    count.textContent = movies.length + ' movies';

    heading.append(headingContent, count);
    section.appendChild(heading);

    if (movies.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'admin-empty-message';
        emptyMessage.textContent = 'No movies in this section yet.';

        section.appendChild(emptyMessage);
        return section;
    }

    movies.forEach(movie => {
        const editorialReview = reviews.find(
            review => review.movie_id === movie.id
        );

        const movieCard = document.createElement('div');
        movieCard.className = 'admin-movie-card';

        const details = document.createElement('div');

        const movieTitle = document.createElement('h3');
        movieTitle.textContent = movie.title;

        const year = document.createElement('p');
        year.textContent = movie.year;

        const genre = document.createElement('p');
        genre.textContent = movie.genre || '';

        const grade = document.createElement('p');
        grade.textContent = 'Editorial Grade: ' +
            (editorialReview?.grade || 'Not set');

        const statusLabel = document.createElement('p');
        statusLabel.className = 'admin-movie-status';
        statusLabel.textContent =
            status === 'published' ? 'Status: Published' : 'Status: Draft';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'admin-edit-button';
        editButton.textContent = 'Edit Movie';

        editButton.addEventListener('click', () => {
            showEditForm(movie, editorialReview, movieCard);
        });

        const statusButton = document.createElement('button');
        statusButton.type = 'button';
        statusButton.className = 'admin-status-button';

        if (status === 'draft') {
            statusButton.textContent = 'Publish Movie';

            statusButton.addEventListener('click', () => {
                updateMovieStatus(movie, 'published', statusButton);
            });

        } else {
            statusButton.textContent = 'Unpublish Movie';

            statusButton.addEventListener('click', () => {
                updateMovieStatus(movie, 'draft', statusButton);
            });
        }

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'admin-delete-button';
        deleteButton.textContent = 'Delete Movie';

        deleteButton.addEventListener('click', () => {
            deleteMovie(movie, deleteButton);
        });

        details.append(
            movieTitle,
            year,
            genre,
            grade,
            statusLabel,
            editButton,
            statusButton,
            deleteButton
        );

        movieCard.appendChild(details);
        section.appendChild(movieCard);
    });

    return section;
}


// Load existing movies and editorial reviews
async function loadMovies() {
    const movieList = document.getElementById('adminMovieList');

    movieList.textContent = 'Loading movies...';

    const { data: movies, error: movieError } = await supabase
        .from('movies')
        .select('id, title, slug, year, genre, poster_url, synopsis, status')
        .order('title');

    if (movieError) {
        movieList.textContent = 'Could not load movies: ' + movieError.message;
        return;
    }

    const { data: reviews, error: reviewError } = await supabase
        .from('editorial_reviews')
        .select('movie_id, grade, review_text');

    if (reviewError) {
        movieList.textContent =
            'Could not load editorial reviews: ' + reviewError.message;
        return;
    }

    movieList.innerHTML = '';

    const publishedMovies = movies.filter(
        movie => movie.status === 'published'
    );

    const draftMovies = movies.filter(
        movie => movie.status !== 'published'
    );

    const publishedSection = createMovieSection(
        'Published Movies',
        'These movies are visible to everyone on ReelRated.',
        publishedMovies,
        reviews,
        'published'
    );

    const draftSection = createMovieSection(
        'Draft Movies',
        'These movies are only visible in your admin dashboard.',
        draftMovies,
        reviews,
        'draft'
    );

    movieList.append(publishedSection, draftSection);
}


// Start dashboard
async function startAdminDashboard() {
    const hasAccess = await checkAdminAccess();

    if (!hasAccess) return;

    document
        .getElementById('addMovieForm')
        .addEventListener('submit', addMovie);

    await loadMovies();
}

startAdminDashboard();
