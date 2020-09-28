import R from 'ramda'

const xformCustomerRaw = (c, context) => {
  const contact = {
    name: c.contact_name,
    title: c.contact_title,
    phone: c.phone,
    fax: c.fax.length > 0 && c.fax,
  }
  const address = {
    street: c.address,
    city: c.city,
    region: c.region.length > 0 && c.region,
    postalCode: c.postal_code.length > 0 && c.postal_code,
    country: c.country,
  }
  const company = {
    id: c.customer_id,
    name: c.company_name,
    contact,
    address,
    __sortKeys: {
      NAME: c.company_name,
      CONTACT_NAME: contact.name,
      COUNTRY: address.country,
    }
  }
  contact.company = company
  return company
}

const companyById = ({ id }, { data }) => {
  const { rows } = data.query('customers', {
    pred: row => row.customer_id == id,
    limit: 1
  })
  if (rows.length == 0) { return null }
  return xformCustomerRaw(rows[0], { data })
}

const companySearch = (args, { data }) => {
  const { first, order, filter } = args
  let limit
  if (first) {
    limit = first
  }

  let sortKey
  let desc
  if (!order) {
    order = { field: 'NAME', direction: 'ASC' }
  }
  if (order.direction == 'DESC') {
    desc = true
  }
  sortKey = {
    NAME: 'company_name',
    CONTACT_NAME: 'contact_name',
    COUNTRY: 'country',
  }[order.field]

  let pred
  if (filter) {
    const preds = []
    if (filter.name) {
      const m = new RegExp(filter.name, 'i')
      preds.push(row => row.company_name.match(m))
    }
    if (filter.country) {
      preds.push(row => row.country == filter.country)
    }
    if (filter.contactName) {
      const m = new RegExp(filter.contactName, 'i')
      preds.push(row => row.contact_name.match(m))
    }
    pred = R.allPass(preds)
  }

  const { rows, totalCount } = data.query(
    'customers',
    { pred, sortKey, desc, limit, pk: 'customer_id' }
  )
  const edges = rows.map(row => {
    const node = xformCustomerRaw(row, { data })
    return {
      cursor: `${order.field}:${node.__sortKeys[order.field]}:${node.id}`,
      compnay: node,
      node
    }
  })
  const nodes = edges.map(edge => edge.node)
  const pageInfo = {}
  if (edges.length > 0) {
    pageInfo.startCursor = edges[0].cursor
    pageInfo.endCursor = edges[edges.length-1].cursor
  }
  return {
    totalCount,
    pageInfo,
    edges,
    nodes,
  }
}

export default { companyById, companySearch }
