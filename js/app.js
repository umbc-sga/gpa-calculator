const GRADE_INFO = [
    {
        letter: "A",
        weight: 4
    },
    {
        letter: "B",
        weight: 3
    },
    {
        letter: "C",
        weight: 2
    },
    {
        letter: "D",
        weight: 1
    },
    {
        letter: "E",
        weight: 0
    }
];

const container = document.querySelector(".container-fluid");
const addCourseButton = document.getElementById("addCourse");
const gpaReadoutEl = document.getElementById("gpa");

/**
 * Initialize the UI components appearance and functionality.
 */
(function initUI() {
    // most people take 4 or more classes, so start with 4 course divs
    for (let i = 1; i <= 4; i++) 
    {
        addCourseDiv();
    }
    
    // bind the add course div function to the add course button
    addCourseButton.onclick = addCourseDiv;
})();

/**
 * Calculate the student's GPA based on their inputs.
 */
function calculateGPA() {
    // track the number of grade points the student has and the credit number
    let gradePoints = 0, creditsTaken = 0;

    // go through every course element
    [...document.querySelectorAll(".course")]
        .forEach(course => {
            // get the credit number and course grade information from the input elements
            const credits = course.querySelector("input[for='courseCredits']").value;
            const grade = course.querySelector("select[for='courseGrade']").value;

            // if the course information is complete
            if (credits && grade != "-")
            {
                // find the grade weight for the corresponding letter grade
                const gradeWeight = GRADE_INFO.find(x => x.letter == grade).weight;

                // calculate grade points by multiplying credits by grade weight
                gradePoints += credits * gradeWeight;

                // track the number of courses that have both credits and grade information
                creditsTaken += parseInt(credits, 10);
            }
        });

    // if at least one course is fully filled out
    if (creditsTaken > 0 && gradePoints > 0)
    {
        // calculate GPA to three decimal points
        gpaReadoutEl.innerText = (gradePoints / creditsTaken).toFixed(3);
    }
}

/**
 * Add a row to the container that allows a student to fill in course information.
 */
function addCourseDiv() {
    // create the row div for all the inputs in their columns
    const courseDiv = createElement(container, "div", {
        class: "row course"
    });
    
    // create the column for the name input
    const nameContainer = createElement(courseDiv, "div", { 
        class: "col-sm-4 mb-1" 
    });
    
    // create the course name text input
    createElement(nameContainer, "input", {
        type: "text",
        class: "form-control",
    });
    
    // create the column for the credits input
    const creditContainer = createElement(courseDiv, "div", { 
        class: "col-sm-4" 
    });
    
    // create the credits number input
    createElement(creditContainer, "input", {
        type: "number",
        for: "courseCredits",
        class: "form-control",
        min: "0",
        max: "4",
        onchange: calculateGPA,
        onkeyup: calculateGPA
    });
   
    // create the column for the grade select menu
    const gradeContainer = createElement(courseDiv, "div", { 
        class: "col-sm-4" 
    });
    
    // create the grade select menu
    const select = createElement(gradeContainer, "select", {
        for: "courseGrade",
        class: "form-control",
        onchange: calculateGPA
    });
    
    // add the options to the grade select menu
    const letterGrades = GRADE_INFO.map(x => x.letter);
    const gradeOptions = [ "-", ...letterGrades ];
    gradeOptions.forEach(grade => {
        const option = document.createElement("option");
        option.text = grade;
        
        select.add(option);
    });
}

/**
 * Create an HTML element and add it to the DOM tree.
 * @param {HTMLElement} parent 
 * @param {String} tag 
 * @param {Object} attributes 
 */
function createElement(parent, tag, attributes={}) {
    // create the element to whatever tag was given
    const el = document.createElement(tag);
    
    // go through all the attributes in the object that was given
    Object.entries(attributes)
        .forEach(([attr, value]) => {
            // handle the various special cases that will cause the Element to be malformed
            if (attr == "innerText") 
            {
                el.innerText = value;
            }
            else if (attr == "innerHTML") 
            {
                el.innerHTML = value;
            }
            else if (attr == "textContent") 
            {
                el.textContent = value;
            }
            else if (attr == "onclick")
            {
                el.onclick = value;
            }
            else if (attr == "onchange")
            {
                el.onchange = value;    
            }
            else if (attr == "onkeydown")
            {
                el.onkeydown = value;
            }
            else if (attr == "onkeyup")
            {
                el.onkeyup = value;
            }
            else
            {
                el.setAttribute(attr, value);
            }
        });
    
    // add the newly created element to its parent
    parent.appendChild(el);

    // return the element in case this element is a parent for later element creation
    return el;
}