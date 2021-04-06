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
const transcriptInput = document.getElementById("transcriptInput");
const importCoursesButtons = document.getElementById("importCourses");
const gpaReadoutEl = document.getElementById("gpa");

/**
 * Initialize the UI components appearance and functionality.
 */
(function initUI() {
    // most people take 4 or more classes, so start with 4 course divs
    addCourseDiv();

    // bind the add course div function to the add course button
    addCourseButton.onclick = () => addCourseDiv();
    importCoursesButtons.onclick = importCourses;
})();

/**
 * From: https://github.com/ffalt/pdf.js-extract/blob/main/lib/index.js
 * @returns 
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
                })
        
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

                    // if the course is not Pass and not a transfer credit
                    if (grade != "P" && grade != "T")
                    {
                        addCourseDiv(`${courseCode} ${courseName}`, parseInt(attempted, 10), grade);
                    }
                }
                else
                {
                    const [ attempted, earned, points ] = tokens;

                    addCourseDiv(`${courseCode} ${courseName}`, parseInt(attempted, 10));
                }
            });

            calculateGPA();
        }
    }   
}

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
            if (credits && grade != "-") {
                // find the grade weight for the corresponding letter grade
                const gradeWeight = GRADE_INFO.find(x => x.letter == grade).weight;

                // calculate grade points by multiplying credits by grade weight
                gradePoints += credits * gradeWeight;

                // track the number of courses that have both credits and grade information
                creditsTaken += parseInt(credits, 10);
            }
        });

    // if at least one course is fully filled out
    if (creditsTaken > 0 && gradePoints > 0) {
        // calculate GPA to three decimal points
        gpaReadoutEl.innerText = (gradePoints / creditsTaken).toFixed(3);
    }
    // otherwise show no GPA (0.0)
    else {
        gpaReadoutEl.innerText = "0.0";
    }
}

/**
 * Add a row to the container that allows a student to fill in course information.
 */
function addCourseDiv(name="My Class", credits=3, grade="-") {
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
        value: name
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
        onchange: calculateGPA,
        onkeyup: calculateGPA
    });

    // create the column for the grade select menu
    const gradeContainer = createElement(courseDiv, "div", {
        class: "col-sm-3"
    });

    // create the grade select menu
    const select = createElement(gradeContainer, "select", {
        for: "courseGrade",
        class: "form-control",
        onchange: calculateGPA
    });

    // add the options to the grade select menu
    const letterGrades = GRADE_INFO.map(x => x.letter);
    const gradeOptions = ["-", ...letterGrades];
    gradeOptions.forEach(grade => {
        const option = document.createElement("option");
        option.text = grade;

        select.add(option);
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

            // recalculate GPA
            calculateGPA();
        }
    });
}

/**
 * Group an array of items into lines by Y-positions with some tolerance for improper line
 * alignments.
 * @param {Object[]} items
 * @param {Number} tolerance
 * @return {Object} groupedLines
 */
function fuzzyGroupByYPos(items, tolerance = 0.3) {
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
function createElement(parent, tag, attributes = {}) {
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
            else if (attr == "onkeydown") {
                el.onkeydown = value;
            }
            else if (attr == "onkeyup") {
                el.onkeyup = value;
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