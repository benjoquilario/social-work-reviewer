#!/usr/bin/env node
/**
 * Converts the bundled questionnaire JSON into the two CSV sheets the
 * dashboard importer reads.
 *
 *   node scripts/questionnaires-to-csv.js [outDir]
 *
 * Writes `questionnaires.csv` and `questions.csv`
 * (default: ./out/questionnaires-import). Open both in Excel, fill in the
 * columns the JSON never had — Difficulty, Explanation, Image — and upload.
 *
 * The JSON is left untouched: this is a one-way export, so it can be re-run
 * as often as needed.
 */

const fs = require("fs")
const path = require("path")

/** Display label for a position: 0 -> A, 25 -> Z, 26 -> AA. No ceiling. */
function toChoiceLabel(index) {
  let remaining = index
  let label = ""

  while (remaining >= 0) {
    label = String.fromCharCode(65 + (remaining % 26)) + label
    remaining = Math.floor(remaining / 26) - 1
  }

  return label
}

const QUESTIONNAIRE_COLUMNS = [
  "Code",
  "Category",
  "Category Code",
  "Set",
  "Mode",
  "Title",
  "Description",
  "Order",
  "Premium",
  "Published",
]

const QUESTION_COLUMNS = [
  "SKU",
  "Questionnaire",
  "No",
  "Question",
  "Choices",
  "Answer",
  "Type",
  "Difficulty",
  "Free",
  "Explanation",
  "Image",
]

/** How many items per paper are marked as the free sample by default. */
const DEFAULT_FREE_SAMPLE = 10

/** Words that carry no signal when building a short code. */
const STOP_WORDS = new Set(["and", "of", "the", "in", "for", "to", "a", "an"])

function toTitleCase(slug) {
  return slug
    .split("_")
    .filter(Boolean)
    .map((word) =>
      word.length <= 2
        ? word.toUpperCase()
        : word[0].toUpperCase() + word.slice(1)
    )
    .join(" ")
}

/**
 * `history_social_conditions_issues_co_drill` -> `HSCI`.
 *
 * Initials of the significant words, capped at six characters. This is a
 * starting point, not a decision — the Category Code column is meant to be
 * edited before import, and it is what every paper code is built from.
 */
function toCategoryCode(slug) {
  const initials = slug
    .split("_")
    .filter((word) => word && !STOP_WORDS.has(word.toLowerCase()))
    .map((word) => word[0].toUpperCase())
    .join("")

  return (initials || slug.slice(0, 4)).slice(0, 6)
}

function buildQuestionnaireCode(categoryCode, setCode) {
  return setCode ? `${categoryCode}-${setCode}` : categoryCode
}

function formatSku(sequence) {
  return `Q-${String(sequence).padStart(6, "0")}`
}

/**
 * RFC 4180: quote every field and double any embedded quote. Board exam stems
 * contain commas, quotes and the occasional newline, so quoting selectively is
 * how a CSV export corrupts itself.
 */
function toCsvCell(value) {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(columns, rows) {
  const lines = [columns.map(toCsvCell).join(",")]

  for (const row of rows) {
    lines.push(columns.map((column) => toCsvCell(row[column])).join(","))
  }

  return lines.join("\r\n")
}

function collectJsonFiles(rootDir) {
  const found = []

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        found.push(full)
      }
    }
  }

  walk(rootDir)
  return found.sort()
}

function main() {
  const projectRoot = path.resolve(__dirname, "..")
  const sourceDir = path.join(projectRoot, "questionaires")
  const outDir = path.resolve(
    process.argv[2] ?? path.join(projectRoot, "out", "questionnaires-import")
  )

  if (!fs.existsSync(sourceDir)) {
    console.error(`No questionnaire directory at ${sourceDir}`)
    process.exit(1)
  }

  const files = collectJsonFiles(sourceDir)

  if (files.length === 0) {
    console.error(`No .json files found under ${sourceDir}`)
    process.exit(1)
  }

  const questionnaireRows = []
  const questionRows = []
  const warnings = []
  const seenCodes = new Map()
  let skuSequence = 0

  files.forEach((file, fileIndex) => {
    const relative = path.relative(projectRoot, file)
    let document

    try {
      document = JSON.parse(fs.readFileSync(file, "utf8"))
    } catch (error) {
      warnings.push(`${relative}: unreadable JSON — ${error.message}`)
      return
    }

    const slug = document.questionnaire ?? path.basename(path.dirname(file))
    const setCode = (document.set ?? "").toString().trim().toUpperCase()
    const categoryTitle = toTitleCase(slug)
    const categoryCode = toCategoryCode(slug)
    const code = buildQuestionnaireCode(categoryCode, setCode)

    if (seenCodes.has(code)) {
      warnings.push(
        `${relative}: code "${code}" already produced by ${seenCodes.get(code)} — skipped. Set a distinct Category Code by hand.`
      )
      return
    }
    seenCodes.set(code, relative)

    const questions = Array.isArray(document.questions) ? document.questions : []

    questionnaireRows.push({
      Code: code,
      Category: categoryTitle,
      "Category Code": categoryCode,
      Set: setCode,
      // Every bundled set is board-exam drill material. Change this cell for
      // any paper that should surface as a short quiz instead.
      Mode: "board exam",
      Title: setCode ? `Set ${setCode}` : categoryTitle,
      Description: "",
      Order: fileIndex + 1,
      Premium: "yes",
      // Deliberately off: review the import before learners see it.
      Published: "no",
    })

    questions.forEach((question, questionIndex) => {
      skuSequence += 1

      const options = Array.isArray(question.options) ? question.options : []
      const choiceTexts = options
        .map((option) => (option.text ?? "").toString().trim())
        .filter((text) => text.length > 0)

      const answerKey = (question.answer?.key ?? "").toString().trim().toUpperCase()
      const answerText = (question.answer?.text ?? "").toString().trim()

      // Prefer matching on the answer text: the key is only a label, and a
      // mislabelled source would otherwise point at the wrong choice silently.
      let answerIndex = choiceTexts.findIndex((text) => text === answerText)

      if (answerIndex === -1 && answerKey) {
        const keyed = options.findIndex(
          (option) => (option.key ?? "").toString().trim().toUpperCase() === answerKey
        )
        answerIndex = keyed
      }

      const row = {
        SKU: formatSku(skuSequence),
        Questionnaire: code,
        No: question.id ?? questionIndex + 1,
        Question: question.question ?? "",
        // One choice per line. Labels are written for readability and stripped
        // again on import, where position is what actually counts.
        Choices: choiceTexts
          .map((text, index) => toChoiceLabel(index) + ". " + text)
          .join("\n"),
        Answer: answerIndex >= 0 ? toChoiceLabel(answerIndex) : "",
        Type: question.type === "true_false" ? "true/false" : "mcq",
        // The JSON never carried these. Left blank so the gap is visible in
        // Excel rather than filled with a guess.
        Difficulty: "",
        // A first sample so the paper is not entirely walled off on import.
        // Swap these for a representative spread before publishing.
        Free: questionIndex < DEFAULT_FREE_SAMPLE ? "yes" : "",
        Explanation: "",
        Image: "",
      }

      if (choiceTexts.length < 2) {
        warnings.push(
          relative + " item " + row.No + ": only " + choiceTexts.length + " choice(s) — needs at least two."
        )
      }

      if (answerIndex < 0) {
        warnings.push(
          relative + " item " + row.No + ": could not resolve the answer — fill the Answer column by hand."
        )
      }

      questionRows.push(row)
    })
  })

  fs.mkdirSync(outDir, { recursive: true })

  const questionnairesPath = path.join(outDir, "questionnaires.csv")
  const questionsPath = path.join(outDir, "questions.csv")

  // BOM so Excel on Windows opens UTF-8 correctly; without it every accented
  // character arrives mojibaked.
  fs.writeFileSync(
    questionnairesPath,
    "﻿" + toCsv(QUESTIONNAIRE_COLUMNS, questionnaireRows),
    "utf8"
  )
  fs.writeFileSync(
    questionsPath,
    "﻿" + toCsv(QUESTION_COLUMNS, questionRows),
    "utf8"
  )

  console.log(
    `Read ${files.length} file(s) from ${path.relative(projectRoot, sourceDir)}`
  )
  console.log(
    `  ${questionnaireRows.length} questionnaire(s) -> ${questionnairesPath}`
  )
  console.log(`  ${questionRows.length} question(s) -> ${questionsPath}`)

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} thing(s) need a human:`)
    for (const warning of warnings.slice(0, 40)) {
      console.log(`  - ${warning}`)
    }

    if (warnings.length > 40) {
      console.log(`  ... and ${warnings.length - 40} more`)
    }
  }
}

main()
