// weights for each grade value
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

// global variable to store course data
const courses = [];

// references to HTML elements
const container = document.getElementById("coursesContainer");
const addCourseButton = document.getElementById("addCourse");
const transcriptInput = document.getElementById("transcriptInput");
const importCoursesButtons = document.getElementById("importCourses");
const cumulativeGpaReadoutEl = document.getElementById("gpa");
const projectedGpaReadoutEl = document.getElementById("projectedGpa");
const bcpmGpaReadoutEl = document.getElementById("bcpmGpa");
const goalGPAInput = document.getElementById("goalGPA");

const latinHonorsAlert = document.getElementById("latinHonorsAlert");
const latinHonorsTextEl = document.getElementById("latinHonors");

const gpaWarningAlert = document.getElementById("gpaWarningAlert");
const gpaWarningMsgEl = document.getElementById("gpaWarningMsg");

const graduationDangerAlert = document.getElementById("graduationDangerAlert");

const meritScholarToggle = document.getElementById("meritScholar");
const preHealthToggle = document.getElementById("preHealth");
const graduatingSoonToggle = document.getElementById("graduatingSoon");

/**
 * Initialize the UI components appearance and functionality.
 */
(function initUI() {
    // start off with an example course div
    addCourseDiv();
    updateGPAReadouts();

    // bind the add course div function to the add course button
    addCourseButton.onclick = () => addCourseDiv();
    importCoursesButtons.onclick = importCourses;

    goalGPAInput.oninput = calculateGPASuggestions;
    document.getElementById("nextSemesterCreditNum").oninput = calculateGPASuggestions;

    // update the GPA stuff if features are enabled
    meritScholarToggle.oninput = updateGPAReadouts;
    preHealthToggle.oninput = updateGPAReadouts;
    graduatingSoonToggle.oninput = updateGPAReadouts;
})();

/**
 * Calculate suggestions for the GPA coach.
 */
function calculateGPASuggestions() {
    // get goal GPA from input
    const goalGPA = parseFloat(goalGPAInput.value);
    const pendingCredits = parseInt(document.getElementById("nextSemesterCreditNum").value, 10);

    // track the number of grade points the student has and the credit number
    let gradePoints = 0, creditsTaken = 0;

    // go through every course element
    courses
        .forEach(course => {
            // get the credit number and course grade information from the input elements
            const credits = course.credits;
            const grade = course.grade;

            // if the course information is complete
            if (credits && grade != "-") {
                // find the grade weight for the corresponding letter grade
                const gradeWeight = GRADE_INFO.find(x => x.letter == grade).weight;

                // calculate grade points by multiplying credits by grade weight
                gradePoints += credits * gradeWeight;

                // track the number of courses that have both credits and grade information
                creditsTaken += credits;
            }
        });

    if (!isNaN(goalGPA) && !isNaN(pendingCredits))
    {
        const gradePointsNeeded = goalGPA * (creditsTaken + pendingCredits) - gradePoints;
        const gpaNeeded = gradePointsNeeded / pendingCredits;

        document.getElementById("gpaSuggestions").textContent = `If you took ${pendingCredits} credits, you would need a ${gpaNeeded.toFixed(3)} in order to make it to your goal GPA of ${goalGPA}.`;
    }
}

/**
 * Recalculate and update the GPA readout(s) based on their inputs.
 */
function updateGPAReadouts() {
    // if some of the courses are imported as complete, show two GPA counters
    const projectedGpaContainer = projectedGpaReadoutEl.parentElement;
    if (courses.some(x => x.completed)) 
    {
        projectedGpaContainer.style.display = "";

        cumulativeGpaReadoutEl.innerText = calculateGPA(courses.filter(x => x.completed));
        projectedGpaReadoutEl.innerText = calculateGPA(courses);
    }
    // hide the projected GPA readout if all courses are non-completed
    else 
    {
        projectedGpaContainer.style.display = "none";

        cumulativeGpaReadoutEl.innerText = calculateGPA(courses);
    }

    // if the student is pre-health, show BCPM (Bio, Chem, Phys, Math) GPA
    const bcpmGpaContainer = bcpmGpaReadoutEl.parentElement;
    bcpmGpaContainer.style.display = "none";
    if (preHealthToggle.checked)
    {
        bcpmGpaContainer.style.display = "";

        const bcpmCourses = courses
            .filter(x => {
                const department = x.name.split(" ")[0];

                return ["BIOL", "CHEM", "MATH", "PHYS", "STAT"].includes(department);
            });

        bcpmGpaReadoutEl.textContent = calculateGPA(bcpmCourses);
    }

    // hide contingent alerts
    latinHonorsAlert.style.display = "none";
    gpaWarningAlert.style.display = "none";
    graduationDangerAlert.style.display = "none";

    // get gpa as float for comparisons
    const gpa = parseFloat(calculateGPA(courses));

    // only caclulate latin honors for people graduating soon
    if (graduatingSoonToggle.checked)
    {
        // check if the GPA qualifies for latin honors
        // source: https://registrar.umbc.edu/university-honors/
        if (gpa > 3.95) 
        {
            latinHonorsAlert.style.display = "";
            latinHonorsTextEl.textContent = "Summa cum laude";
        }
        else if (gpa > 3.75 && gpa < 3.9499) 
        {
            latinHonorsAlert.style.display = "";
            latinHonorsTextEl.textContent = "Magna cum laude";
        }
        else if (gpa > 3.5 && gpa < 3.7499) 
        {
            latinHonorsAlert.style.display = "";
            latinHonorsTextEl.textContent = "Cum laude";
        }
    }

    graduationDangerAlert.style.display = "none";
    gpaWarningAlert.style.display = "none";
        
    // show graduation danger alert if user is near or below 2.0 GPA 
    if (gpa < 2.2) 
    {
        // make sure that there is a class w/ a grade before showing the danger alert
        if (courses.filter(x => x.grade != "-").length) 
        {
            graduationDangerAlert.style.display = "";
        }
    }
    // show GPA warning if they are a merit scholar and near or below a 3.25 GPA
    else if (gpa < 3.4) 
    {
        if (meritScholarToggle.checked) 
        {
            gpaWarningAlert.style.display = "";
            gpaWarningMsgEl.innerHTML = `UMBC Merit Scholars must maintain a minimum cumulative 3.25 grade point average in order to remain eligible for their scholarship (<a href="https://scholarships.umbc.edu/currentscholars/">Source</a>).`;
        }
    }

    // re-calculate GPA suggestions if GPA is changed too
    calculateGPASuggestions();
}

/**
 * Add a row to the container that allows a student to fill in course information.
 * @param {String} name
 * @param {Number} credits
 * @param {String} grade
 * @param {Boolean} imported
 */
function addCourseDiv(name="Enter Class Name Here", credits=3, grade="-", completed=false) {
    // create a course object
    const course = {
        name: name,
        credits: credits,
        grade: grade,
        completed: completed
    };

    // add the course object to the courses array
    courses.push(course);

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
        value: name,
        oninput: e => {
            // update course name property
            course.name = e.target.value;

            updateGPAReadouts();
        }
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
        value: credits,
        onchange: e => {
            // update course credits property
            course.credits = e.target.value;

            // recalculate GPA
            updateGPAReadouts();
        },
        onkeyup: e => {
            // update course credits property
            course.credits = e.target.value;

            // recalculate GPA
            updateGPAReadouts();
        }
    });

    // create the column for the grade select menu
    const gradeContainer = createElement(courseDiv, "div", {
        class: "col-sm-3"
    });

    // create the grade select menu
    const select = createElement(gradeContainer, "select", {
        for: "courseGrade",
        class: "form-control",
        onchange: e => {
            // update course grade property
            course.grade = e.target.value;

            // recalculate GPA
            updateGPAReadouts();
        }
    });

    // add the options to the grade select menu
    const letterGrades = GRADE_INFO.map(x => x.letter);
    const gradeOptions = ["-", ...letterGrades];
    gradeOptions.forEach(grade => {
        select.add(createElement(select, "option", {
            text: grade
        }));
    });

    // set the value to the grade (default or otherwise)
    select.value = grade;

    // create a div column for the delete button
    const buttonContainer = createElement(courseDiv, "div", {
        class: "col-sm-1"
    });

    // add a course deletion button
    createElement(buttonContainer, "button", {
        class: "btn btn-danger",
        textContent: "Delete",
        onclick: () => {
            // remove the course element
            courseDiv.remove();

            // delete course from the courses array
            courses.splice(courses.indexOf(course), 1);

            // recalculate GPA
            updateGPAReadouts();
        }
    });

    // update GPA readout for credit count
    updateGPAReadouts();
}

/**
 * Parse a PDF and extract the text contents from the pages.
 * From: https://github.com/ffalt/pdf.js-extract/blob/main/lib/index.js
 * @param {String} base64Data
 * @returns {Object} data
 */
async function parsePDF(base64PdfData) {
    const options = {};
    const pdf = {
        meta: {},
        pages: []
    };

    // Will be using promises to load document, pages and misc data instead of callback.
    const doc = await pdfjsLib.getDocument({ data: base64PdfData }).promise;
    const firstPage = (options && options.firstPage) ? options.firstPage : 1;
    const lastPage = Math.min((options && options.lastPage) ? options.lastPage : doc.numPages, doc.numPages);

    pdf.pdfInfo = doc.pdfInfo;

    const promises = [
        doc.getMetadata().then(data => {
            pdf.meta = data;
            if (pdf.meta.metadata && pdf.meta.metadata._metadataMap) {
                // convert to old data structure Map => Object
                pdf.meta.metadata = {
                    _metadata: Array.from(pdf.meta.metadata._metadataMap.entries()).reduce((main, [key, value]) => ({ ...main, [key]: value }), {})
                };
            }
        })
    ];

    const loadPage = pageNum => doc.getPage(pageNum).then(page => {
        const viewport = page.getViewport({ scale: 1.0 });

        const pag = {
            pageInfo: {
                num: pageNum,
                scale: viewport.scale,
                rotation: viewport.rotation,
                offsetX: viewport.offsetX,
                offsetY: viewport.offsetY,
                width: viewport.width,
                height: viewport.height
            }
        };

        pdf.pages.push(pag);

        const normalizeWhitespace = !!(options && options.normalizeWhitespace === true);
        const disableCombineTextItems = !!(options && options.disableCombineTextItems === true);

        return page.getTextContent({ normalizeWhitespace, disableCombineTextItems }).then((content) => {
            // Content contains lots of information about the text layout and styles, but we need only strings at the moment
            pag.content = content.items.map(item => {
                const tm = item.transform;

                let x = tm[4];
                let y = pag.pageInfo.height - tm[5];

                if (viewport.rotation === 90) {
                    x = tm[5];
                    y = tm[4];
                }

                // see https://github.com/mozilla/pdf.js/issues/8276
                const height = Math.sqrt(tm[2] * tm[2] + tm[3] * tm[3]);

                return {
                    x: x,
                    y: y,
                    str: item.str,
                    dir: item.dir,
                    width: item.width,
                    height: height,
                    fontName: item.fontName
                };
            });
        })
    });

    for (let i = firstPage; i <= lastPage; i++) {
        promises.push(loadPage(i));
    }

    await Promise.all(promises);

    return pdf;
}

/**
 * Import the courses into the GPA calculator from the PDF.
 */
async function importCourses() {
    // make sure that the user has attached a file
    if (transcriptInput.files.length === 0)
    {
        return;
    }

    // get the transcript file attachment
    const transcript = transcriptInput.files[0];

    // create a file reader and read file in base64 encoding
    const fileReader = new FileReader();
    fileReader.readAsDataURL(transcript);

    // bind callback to file reader load event
    fileReader.onload = async () => {
        // clear file input
        transcriptInput.value = "";

        // get data into base64 encoding and convert to binary to parse the PDF
        const data = await parsePDF(atob(fileReader.result.replace("data:application/pdf;base64,", "")));

        // go through every page
        for (const page of data.pages) {
            // get the lines of the PDF (lines is an array of line items arrays) by grouping by y-coordinate
            const sortedRawLines = Object.values(fuzzyGroupByYPos(page.content, 0))
                // order lines by y-coordinate in ascending order
                .sort((a, b) => a[0].y - b[0].y)
                // order items within lines by x-coordinate in ascending order
                .map(x => x.sort((a, b) => a.x - b.x));

            // put together line strings
            const reconstructedLines = sortedRawLines
                .map(line => line.reduce((a, b) => a + " " + b.str, ""));

            // go through all the reconstructed lines
            const courseLines = reconstructedLines
                // filter out all the non-course lines
                .filter(line => {
                    return line.includes(".00") && !line.includes("Overall Cum GPA")
                        && !line.includes("UMBC Cum GPA") && !line.includes("UMBC Term GPA")
                            && !line.includes("Overall Term GPA") && !line.includes("Test Trans GPA")
                });

            // go through all the course lnes
            courseLines.forEach(line => {
                // filter out empty strings
                const tokens = line.split(" ").filter(x => x != "");

                // reconstruct the course code from the tokens
                const [ subject, courseNum ] = tokens;
                const courseCode = `${subject} ${courseNum}`;
                tokens.splice(0, 2);

                /**
                 * Reconstruct the course name from the tokens. This is harder thant it looks because we don't know how long
                 * a course name will be and from the other end it can be either 3 or 4 columns depending if the course has a grade or not.
                 */
                const courseNameTokens = [];
                while (isNaN(parseFloat(tokens[0])))
                {
                    courseNameTokens.push(tokens[0]);
                    tokens.splice(0, 1);
                }
                const courseName = courseNameTokens.join(" ");

                // get the credit and grade information for the course
                if (tokens.length == 4)
                {
                    const [ attempted, earned, grade, points ] = tokens;

                    // if the course is not Pass, Withdraw, or a transfer credit
                    if (!["P", "W", "T"].includes(grade))
                    {
                        // create a course object
                        const course = {
                            name: `${courseCode} ${courseName}`,
                            credits: parseInt(attempted, 10),
                            grade: grade,
                            completed: true
                        };

                        const firstTry = courses.find(x => x.name == course.name);

                        if (firstTry)
                        {
                            const grades = GRADE_INFO.map(x => x.letter);

                            // if the student retook the course and got a higher grade, remove the old grade
                            if (grades.indexOf(course.grade) < grades.indexOf(firstTry.grade))
                            {
                                // remove the course div
                                coursesContainer.children[courses.indexOf(firstTry)].remove();

                                // remove the old grade
                                courses.splice(courses.indexOf(firstTry), 1);
                            }
                        }

                        addCourseDiv(`${courseCode} ${courseName}`, parseInt(attempted, 10), grade, true);
                    }
                }
                else
                {
                    const [ attempted, earned, points ] = tokens;

                    addCourseDiv(`${courseCode} ${courseName}`, parseInt(attempted, 10));
                }               
            });

            updateGPAReadouts();
        }
    }   
}

/**
 * Calculate the grade point average for a list of courses.
 * @param {Object[]} courses 
 * @returns {String} gpa
 */
function calculateGPA(courses) {
    // track the number of grade points the student has and the credit number
    let gradePoints = 0, creditsTaken = 0;

    // go through every course element
    courses
        .forEach(course => {
            // get the credit number and course grade information from the input elements
            const credits = course.credits;
            const grade = course.grade;

            // if the course information is complete
            if (credits && grade != "-") {
                // find the grade weight for the corresponding letter grade
                const gradeWeight = GRADE_INFO.find(x => x.letter == grade).weight;

                // calculate grade points by multiplying credits by grade weight
                gradePoints += credits * gradeWeight;

                // track the number of courses that have both credits and grade information
                creditsTaken += credits;
            }
        });

    // if at least one course is fully filled out
    if (creditsTaken > 0 && gradePoints > 0) 
    {
        // calculate GPA to three decimal points
        return (gradePoints / creditsTaken).toFixed(3);
    }
    // otherwise show no GPA (0.0)
    else 
    {
        return "0.0";
    }
}

/**
 * Group an array of items into lines by Y-positions with some tolerance for improper line
 * alignments.
 * @param {Object[]} items
 * @param {Number} tolerance
 * @return {Object} groupedLines
 */
function fuzzyGroupByYPos(items, tolerance=0.3) {
    return items.reduce((linesArray, item) => {
        // get the closest previously recorded y-pos bucket
        // from: https://stackoverflow.com/questions/8584902/get-the-closest-number-out-of-an-array
        const closest = Object.keys(linesArray)
            .reduce((prev, curr) => (Math.abs(curr - item.y) < Math.abs(prev - item.y) ? curr : prev), 0);

        // calculate the difference between the closest line by Y-pos and the current line
        const difference = Math.abs(closest - item.y);

        // if the difference is close enough, it is the same line, just improperly aligned
        if (difference < tolerance && difference !== 0) {
            linesArray[closest].push(item);
        }
        // otherwise it is a different line
        else {
            // from: https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects
            (linesArray[item.y] = linesArray[item.y] || []).push(item);
        }

        return linesArray;
    }, {});
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
            if (attr == "innerText") {
                el.innerText = value;
            }
            else if (attr == "innerHTML") {
                el.innerHTML = value;
            }
            else if (attr == "textContent") {
                el.textContent = value;
            }
            else if (attr == "onclick") {
                el.onclick = value;
            }
            else if (attr == "onchange") {
                el.onchange = value;
            }
            else if (attr == "oninput") {
                el.oninput = value;
            }
            else if (attr == "onkeydown") {
                el.onkeydown = value;
            }
            else if (attr == "onkeyup") {
                el.onkeyup = value;
            }
            else if (attr == "text") {
                el.text = value;
            }
            else if (attr == "value") {
                el.value = value;
            }
            else {
                el.setAttribute(attr, value);
            }
        });

    // add the newly created element to its parent
    parent.appendChild(el);

    // return the element in case this element is a parent for later element creation
    return el;
}