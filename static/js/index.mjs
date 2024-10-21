import { getImages, addImage, deleteImage, getComments, addComment, deleteComment, signup, signin, signout, getCurrentUser, getUsers } from './api.mjs';

function onError(err) {
  console.error("[error]", err);
  const error_box = document.querySelector("#error_box");
  error_box.innerHTML = err.message;
  error_box.style.visibility = "visible";
}

let current_user = getCurrentUser();
let selected_user = null;

//Signup
document.getElementById("to_signup_form").addEventListener("click", function(e) {
  e.preventDefault();
  document.querySelector("#signup_form").classList.remove("hidden");
  document.querySelector("#signin_form").classList.add("hidden");
});

document.getElementById("signup_form").addEventListener("submit", function(e) {
  e.preventDefault();
  const username = document.querySelector('#signup_form input[name="username"]').value;
  const password = document.querySelector('#signup_form input[name="password"]').value;

  signup(username, password, onError, function () {
    console.log("Sign-up successful!");
    document.querySelector("#error_box").style.visibility = "hidden";
    document.querySelector("#signup_form").classList.add("hidden");
    document.querySelector("#signin_form").classList.remove("hidden");
  });
});

//Signin
document.getElementById("to_signin_form").addEventListener("click", function(e) {
  e.preventDefault();
  document.querySelector("#signup_form").classList.add("hidden");
  document.querySelector("#signin_form").classList.remove("hidden");
});

document.getElementById("signin_form").addEventListener("submit", function(e) {
  e.preventDefault();
  const username = document.querySelector('#signin_form input[name="username"]').value; 
  const password = document.querySelector('#signin_form input[name="password"]').value;

  // Call the signin function
  signin(username, password, onError, function () {
    console.log("Sign-in successful!");
    current_user = getCurrentUser();
    document.querySelector("#error_box").style.visibility = "hidden";
    document.querySelector("#signin_form").classList.add("hidden");
    document.querySelector("#signout_button").classList.remove("hidden");
    document.getElementById("my_gallery_button").classList.remove("hidden");
    document.getElementById("my_gallery_button").classList.remove("active-button"); 
    document.getElementById("browse_button").classList.remove("hidden");
    document.getElementById("browse_button").classList.add("active-button"); 
    document.querySelector("#browse_galleries_container").classList.remove("hidden");
    updateBrowse();
  });
});

//Signout
document.getElementById("signout_button").addEventListener("click", function(e) {
  e.preventDefault();
  signout(onError, function () {
    document.getElementById("toggle_form").classList.add("hidden");
    document.querySelector("#signin_form").classList.remove("hidden");
    document.getElementById("signout_button").classList.add("hidden");
    document.querySelector("#browse_button").classList.add("hidden");
    document.getElementById("my_gallery_button").classList.add("hidden");
    document.querySelector("#browse_galleries_container").classList.add("hidden");
    document.querySelector("#gallery_container").classList.add("hidden");
    document.getElementById("add_image_form").style.display = "none";
  });
});

// My Gallery Button
document.getElementById("my_gallery_button").addEventListener("click", function(e) {
  e.preventDefault();
  document.getElementById("toggle_form").classList.remove("hidden");
  document.getElementById("toggle_form").classList.remove("active-button");
  document.getElementById("add_image_form").style.display = "none";

  document.getElementById("browse_galleries_container").classList.add("hidden");
  this.classList.add("active-button"); 
  document.getElementById("browse_button").classList.remove("active-button"); 
  selected_user = current_user;
  updateGallery(selected_user);
});

// Browse Galleries Button
document.getElementById("browse_button").addEventListener("click", function(e) {
  e.preventDefault();
  document.getElementById("toggle_form").classList.add("hidden");
  document.getElementById("toggle_form").classList.remove("active-button");
  document.getElementById("add_image_form").style.display = "none";

  document.getElementById("gallery_container").classList.add("hidden");
  this.classList.add("active-button"); 
  document.getElementById("my_gallery_button").classList.remove("active-button"); 
  this.classList.add("active-button"); 

  current_comment_page = 0;
  document.getElementById("prev_comments").style.display = "none";
  document.getElementById("next_comments").style.display = "none";
  updateBrowse();
});

let index = 0;
let current_comment_page  = 0;

// Lab 3 Adapted Code
// Gallery
function updateGallery(user) {
  if(user == current_user) {
    document.getElementById("toggle_form").classList.remove("hidden");
  }
  document.querySelector("#error_box").style.visibility = "hidden";
  getImages( user, onError, function (images) {
    document.getElementById("gallery_container").classList.remove("hidden");
    document.getElementById("gallery_container").innerHTML = "";
    if (images.length === 0) {
      const noImageMessage = document.createElement("strong");
      noImageMessage.textContent = "No images!";
      document.getElementById("gallery_container").appendChild(noImageMessage);
      return;
    }
    
    // index is within bounds
    if (index >= images.length) {
      index = images.length - 1;
    } else if (index < 0) {
      index = 0;
    }

    const image = images[index];

    //Create image display
    const image_element = document.createElement("div");

    image_element.className = "image_display";
    image_element.innerHTML = `
      <button id="prev_btn">❮</button>
      <button id="next_btn">❯</button>
      <div id="image_container">
          <img class="current_image" src="/api/images/${image._id}/" alt="No image available" />
          <p><strong id="title_text">${image.title}</strong></p>
          <p><strong>Author:</strong> <span>${image.author}</span></p>
      </div>
    `;

    if (image.author === current_user) {
      const deleteButton = document.createElement("button");
      deleteButton.id = "delete_image";
      deleteButton.textContent = "Delete Image";
      image_element.appendChild(deleteButton);
    }

    document.getElementById("gallery_container").append(image_element);

    if (images.length === 1) {
      image_element.querySelector("#prev_btn").classList.add("hidden");
      image_element.querySelector("#next_btn").classList.add("hidden");
    } else {
      image_element.querySelector("#prev_btn").classList.remove("hidden");
      image_element.querySelector("#next_btn").classList.remove("hidden");
    }

    //Create comment section
    const comment_section = document.createElement("div");
    comment_section.id = "comment_section";
    comment_section.innerHTML = `
      <h2>Leave a Comment!</h2>
      <form id="comment_form">
          <textarea class="comment_element" id="comment_text" placeholder="Type your comment..." required></textarea>
          <button type="submit">Comment</button>
      </form>
      <div id="comments"></div>
    `;
    document.getElementById("gallery_container").append(comment_section);

    getComments(current_comment_page, image._id, onError, function (comments) { 
      renderComments(comments);
    })

    // Adding a comment
    document.getElementById("comment_form").addEventListener("submit", function(e) {
      e.preventDefault();
      const content = document.getElementById("comment_text").value;
      
      addComment(image._id, current_user, content, onError, function(newComment) {
        document.getElementById("comment_form").reset();
        current_comment_page = 0;
        updateGallery(user);
      });
    });

    // Deleting an image
    const delete_button = image_element.querySelector("#delete_image");
    if (delete_button) {
      delete_button.addEventListener("click", function () {
        deleteImage(image._id, onError, function() {
          current_comment_page = 0; // Reset
          renderComments([]);
          updateGallery(user);
        });
      });
    }

    // Go to previous image
    image_element.querySelector("#prev_btn").addEventListener("click", function () {
      index = (index - 1 + images.length) % images.length; 
      current_comment_page = 0; //reset
      updateGallery(user);
    });

    // Go to next image
    image_element.querySelector("#next_btn").addEventListener("click", function () {
      index = (index + 1) % images.length;
      current_comment_page = 0; //reset
      updateGallery(user);
    });
  });
}

let current_gallery_page = 0;

function updateBrowse() {
  getUsers(current_gallery_page, onError, function (users) {
    const browseContainer = document.getElementById("browse_galleries_container");
    browseContainer.classList.remove("hidden");
    browseContainer.innerHTML = "";

    const prevButton = document.createElement("button");
    prevButton.id = "prev_btn";
    prevButton.textContent = "❮";

    const nextButton = document.createElement("button");
    nextButton.id = "next_btn";
    nextButton.textContent = "❯";

    browseContainer.appendChild(prevButton);
    browseContainer.appendChild(nextButton);

    const totalPages = Math.ceil(users.total / users.limit);
    if (current_gallery_page <= 0) {
      browseContainer.querySelector("#prev_btn").classList.add("hidden");
    } else {
      browseContainer.querySelector("#prev_btn").classList.remove("hidden");
    }

    if (current_gallery_page >= totalPages - 1) {
      browseContainer.querySelector("#next_btn").classList.add("hidden");
    } else {
      browseContainer.querySelector("#next_btn").classList.remove("hidden");
    }
    
    users.users_array.forEach( function (user) {
      const gallery_element = document.createElement("div");
      const user_id_span = document.createElement("span");
      user_id_span.textContent = user._id; 
      gallery_element.appendChild(user_id_span);

      if (user.image) {
        gallery_element.style.backgroundImage = `url(/api/images/${user.image}/)`;
      }

      gallery_element.addEventListener("click", function () {
        selected_user = user._id;
        browseContainer.classList.add("hidden");
        document.getElementById("browse_button").classList.remove("active-button"); 
        updateGallery(selected_user);
      });
      browseContainer.appendChild(gallery_element);
    });

    // Go to previous galleries
    browseContainer.querySelector("#prev_btn").addEventListener("click", function () {
      if (current_gallery_page > 0) {
        current_gallery_page -= 1;
        updateBrowse();
      }
    });

    // Go to next galleries
    browseContainer.querySelector("#next_btn").addEventListener("click", function () {
      let total_pages = Math.ceil(users.total / users.limit); // Assuming 'total_users' and 'limit' are defined
      if (current_gallery_page < total_pages - 1) {
        current_gallery_page += 1;
        updateBrowse();
      }
    });
  });
}

// On page load and previously logged in
if (current_user) {
  document.getElementById("error_box").style.visibility = "hidden";
  document.getElementById("signin_form").classList.add("hidden");
  document.getElementById("signout_button").classList.remove("hidden");
  document.getElementById("my_gallery_button").classList.remove("hidden");
  document.getElementById("my_gallery_button").classList.remove("active-button"); 
  document.getElementById("browse_button").classList.remove("hidden");
  document.getElementById("browse_button").classList.add("active-button"); 
  updateBrowse();
} 
else {
  document.getElementById("error_box").style.visibility = "hidden";
  document.getElementById("signin_form").classList.remove("hidden");
  document.getElementById("signout_button").classList.add("hidden");
  document.getElementById("my_gallery_button").classList.add("hidden");
  document.getElementById("browse_button").classList.add("hidden");
}


// Adding an image
document.getElementById("image_form").addEventListener("submit", function (e) {
  e.preventDefault();
  const title = document.getElementById("image_title").value;
  const file = document.getElementById("image_file").files[0];

  document.getElementById("image_form").reset();
  addImage(title, current_user, file,  onError, function(image){
    getImages(current_user, onError, function(images) {
      index = images.length - 1;
      updateGallery(current_user);
    });
  });
});

// adapted ChatGPT code
// Rendering comments of each image
function renderComments(comments) {
  document.getElementById("comments").innerHTML = "";

  comments.forEach(function (comment) {
    const comment_element = document.createElement("div");
    comment_element.className = "comment";
    comment_element.innerHTML = `
      <div class="comment_info">
          <div class="comment_name">${comment.author}</div>
          <div class="comment_date"> | ${new Date(comment.date).toLocaleDateString()}</div>
          <div class="delete_icon"></div>
      </div>
      <div class="comment_content">${comment.content}</div>
    `;
    document.getElementById("comments").append(comment_element);

    // Deleting a comment
    comment_element.querySelector(".delete_icon").addEventListener("click", function (e) {
      e.preventDefault();
      deleteComment(comment.imageId, comment._id, onError, updateGallery(selected_user));
    })
  });

  // Show/hide buttons based on the current page
  document.getElementById("prev_comments").style.display = (current_comment_page == 0) ? 'none' : 'block';
  document.getElementById("prev_comments").style.top = (comments.length == 0) ? '100%' : 'auto';
  document.getElementById("next_comments").style.display = (comments.length < 10)? 'none' : 'block';
}

// Show the previous 10 comments button
document.getElementById("prev_comments").addEventListener("click", function(e) {
  e.preventDefault();
  current_comment_page=Math.max(0, current_comment_page-1);
  updateGallery(selected_user);
});

// Show the next 10 comments button
document.getElementById("next_comments").addEventListener("click", function(e) {
  e.preventDefault();
  current_comment_page+=1;
  updateGallery(selected_user);
});

// Add image form
const addImageForm = document.getElementById("add_image_form");
const addImageToggle = document.getElementById("toggle_form");
addImageForm.style.display = "none";
// Image form toggling
document.getElementById("toggle_form").addEventListener("click", function (e) {
  e.preventDefault();
  if (addImageForm.style.display === "none") {
    addImageForm.style.display = "block"; // Show form
    addImageToggle.classList.add("active-button"); 
    enableDragging(addImageForm);
  } else {
    addImageForm.style.display = "none"; // Hide form
    addImageToggle.classList.remove("active-button"); 
  }
});

// Stack overflow: Akhil Aravind
function enableDragging(windowElement) {
  let isDragging = false;
  let initialX;
  let initialY;

  windowElement.addEventListener('mousedown', startDragging);
  windowElement.addEventListener('mouseup', stopDragging);
  windowElement.addEventListener('mousemove', drag);

  function startDragging(e) {
    // Modified
      const tagName = e.target.tagName.toLowerCase();
      const isTextInput = (tagName === 'input' || tagName === 'textarea') || window.getSelection().toString().length > 0;
      
      if (isTextInput) {
          return; // If cursor is over text, prevent dragging
      }

      isDragging = true;
      initialX = e.clientX - windowElement.getBoundingClientRect().left;
      initialY = e.clientY - windowElement.getBoundingClientRect().top;
      windowElement.style.position = "absolute";
      windowElement.style.userSelect = "none"; 
  }

  function stopDragging() {
      isDragging = false;
  }

  function drag(e) {
      if (isDragging) {
          const newX = e.clientX - initialX;
          const newY = e.clientY - initialY;
          windowElement.style.left = `${newX}px`;
          windowElement.style.top = `${newY}px`;
      }
  }
}

// W3 Schools
var prevScrollPos = window.scrollY;
var scrollThreshold = 100;

window.onscroll = function() {
  var currentScrollPos = window.scrollY;
  
  if (currentScrollPos === 0) {
    document.getElementById("top_nav").style.top = "0";
  } else if (prevScrollPos > currentScrollPos && currentScrollPos < scrollThreshold) {
    document.getElementById("top_nav").style.top = "0";
  } else {
    document.getElementById("top_nav").style.top = "-100px";
  }

  prevScrollPos = currentScrollPos;
}
