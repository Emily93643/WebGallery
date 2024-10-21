function handleResponse(res){
	if (res.status < 200 || res.status >= 300) { return res.text().then(text => { throw new Error(`${text} (status: ${res.status})`)}); }
	return res.json();
}

/*  ******* Data types *******
    image objects must have at least the following attributes:
        - (String) _id 
        - (String) title
        - (String) author
        - (Date) date

    comment objects must have the following attributes
        - (String) _id
        - (String) imageId
        - (String) author
        - (String) content
        - (Date) date

****************************** */

export function getImages(userId, fail, success) {
    fetch(`/api/users/${userId}/images/`)
        .then(handleResponse)
        .then(images => {
            // Sort images by their createdAt date (oldest first)
            images.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            success(images);
        })
        .catch(fail);
}

// add an image to the gallery
export function addImage(title, userId, image, fail, success) {
	const data = new FormData();
    data.append("title", title);
	data.append("image", image);
    fetch(`/api/users/${userId}/images/`, {
        method: "POST",
        body: data
    })
    .then(handleResponse)
    .then(success)
    .catch(fail);
}

// delete an image from the gallery given its imageId
export function deleteImage(imageId, fail, success) {
    fetch(`/api/images/${imageId}/`, {
        method: "DELETE"
    })
    .then(handleResponse)
    .then(success)
    .catch(fail);
}

export function getComments(page, imageId, fail, success) {
    fetch(`/api/images/${imageId}/comments/?page=${page}`)
        .then(handleResponse)
        .then(success)
        .catch(fail);
}

// add a comment to an image
export function addComment(imageId, author, content, fail, success) {
    fetch(`/api/images/${imageId}/comments/`, {
        method: "POST",
        body: JSON.stringify({ author: author, content: content, date: new Date().toISOString() }),
        headers: { "Content-Type": "application/json" }
    })
    .then(handleResponse)
    .then(success)
    .catch(fail);
}

// delete a comment to an image
export function deleteComment(imageId, commentId, fail, success) {
    fetch(`/api/images/${imageId}/comments/${commentId}`, {
        method: "DELETE"
    })
    .then(handleResponse)
    .then(success)
    .catch(fail);
}

export function signup(username, password, fail, success) {
    fetch("/api/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    })
    .then(handleResponse)
    .then(success)
    .catch(fail);
}

export function signin(username, password, fail, success) {
    fetch("/api/signin/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    })
    .then(handleResponse)
    .then(success)
    .catch(fail);
}

export function signout(fail, success) {
    fetch("/api/signout/", {
        method: "GET"
    })
    .then(handleResponse)
    .then(success)
    .catch(fail);
}

export function getUsers(page, fail, success) {
    fetch(`/api/users/?page=${page}`)
        .then(handleResponse)
        .then(success)
        .catch(fail);
}

export function getCurrentUser() {
    return document.cookie.replace(
      /(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/,
      "$1",
    );
}