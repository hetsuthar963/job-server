import mongoose from 'mongoose'

const jobSchema = new mongoose.Schema({
  title      : { type: String,  required: true },
  company    : { type: String,  default : 'Unknown company' },
  location   : { type: String,  default : 'Remote / Not specified' },
  experience : { type: String,  default : 'Not specified' },
  skills     : { type: [String], default: [] },
  summary    : { type: String,  required: true },
  insights   : { type: String,  default : '' },
  priority   : { type: String, enum: ['HIGH','MEDIUM','LOW'], default: 'LOW' },
  role_tags  : { type: [String], default: [] },
  source_url : { type: String,  required: true },
  url        : { type: String,  required: true },            // original scraped URL
  scrapedAt  : { type: Date,    default : Date.now }
})

export default mongoose.model('Job', jobSchema)
